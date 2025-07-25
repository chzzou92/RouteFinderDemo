#include "crow.h"
#include "crow/middlewares/cors.h"
#include <cstdio>
#include <stdio.h>
#include <unordered_map>
#include <iostream>
#include <tuple>
#include <unordered_set>
#include <queue>
#include <curl/curl.h>
#include <future>
#include "utils/Utils.hpp"
#include "env.h"

const std::string token = GOOGLE_API_KEY;

struct Coord {
    double lat, lng;
    bool operator==(Coord const& o) const {
        return lat == o.lat && lng == o.lng;
    }
};
struct CoordHash {
    std::size_t operator()(Coord const& c) const noexcept {
        auto h1 = std::hash<long long>()(static_cast<long long>(c.lat * 1e6));
        auto h2 = std::hash<long long>()(static_cast<long long>(c.lng * 1e6));
        return h1 ^ (h2 << 1);
    }
};
struct PairCoordHash {
    std::size_t operator()(std::pair<Coord, Coord> const& p) const noexcept {
        // Reuse CoordHash on each element
        CoordHash ch;
        std::size_t h1 = ch(p.first);
        std::size_t h2 = ch(p.second);
        // Combine them (XOR + shift is a common simple mix)
        return h1 ^ (h2 << 1);
    }
};

struct nodeHash {
    std::size_t operator()(const std::pair<int, int>& p) const {
        return std::hash<int>{}(p.first) ^ (std::hash<int>{}(p.second) << 1);
    }
};

// A small helper to capture libcurl’s response into a std::string
static size_t _curlWrite(void* buf, size_t size, size_t nmemb, void* up) {
    std::string* resp = static_cast<std::string*>(up);
    resp->append(static_cast<char*>(buf), size * nmemb);
    return size * nmemb;
}

//  Simple HTTP GET (you already had this):
std::string httpGet(const std::string& url) {
    CURL* curl = curl_easy_init();
    std::string response;
    curl_easy_setopt(curl, CURLOPT_URL,           url.c_str());
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, _curlWrite);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA,     &response);
    curl_easy_perform(curl);
    curl_easy_cleanup(curl);
    return response;
}


// HTTP POST that sends a JSON body & returns the response body as a string
std::string httpPost(const std::string& url, const std::string& jsonBody) {
    CURL* curl = curl_easy_init();
    std::string response;

    curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
    curl_easy_setopt(curl, CURLOPT_POST, 1L);
    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, jsonBody.c_str());
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, _curlWrite);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA,     &response);

    struct curl_slist* headers = nullptr;
    headers = curl_slist_append(headers, "Content-Type: application/json");
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);

    curl_easy_perform(curl);

    curl_slist_free_all(headers);
    curl_easy_cleanup(curl);
    return response;
}


//  getTime uses Google’s Routes API 
int getTime(const Coord& start, const Coord& end) {
    // 1) Build the Distance Matrix GET URL
    std::ostringstream qs;
    qs << "https://maps.googleapis.com/maps/api/distancematrix/json"
        << "?destinations=" << end.lat << "%2C" << end.lng
       << "&origins=" << start.lat  << "%2C" << start.lng
       << "&key=" << GOOGLE_API_KEY;

    std::string url = qs.str();

    // 2) Perform the HTTP GET
    std::string body = httpGet(url);

    // 3) Parse JSON with Crow
    auto j = crow::json::load(body);
    if (!j) {
        throw std::runtime_error("Invalid JSON from Google Distance Matrix.");
    }

    // 4) Check top‐level status
    if (!j.has("status") || j["status"].s() != "OK") {
        std::ostringstream err;
        err << "Distance Matrix API status: "
            << (j.has("status") ? j["status"].s() : std::string("MISSING"))
            << "\nFull JSON:\n" << j;
        throw std::runtime_error(err.str());
    }

    // 5) Drill down: rows → elements
    if (!j.has("rows") ||
        !j["rows"][0].has("elements") ||
        !j["rows"][0]["elements"][0].has("status")) {
        std::ostringstream err;
        err << "Unexpected JSON structure (missing rows/elements/status). Full JSON:\n"
            << j;
        throw std::runtime_error(err.str());
    }

    auto& elem = j["rows"][0]["elements"][0];
    if (elem["status"].s() != "OK") {
        std::ostringstream err;
        err << "No route found (element.status=" << elem["status"].s() << ").\n"
            << "Full element JSON:\n" << elem;
        throw std::runtime_error(err.str());
    }

    // 6) Extract duration.value (seconds)
    if (!elem.has("duration") || !elem["duration"].has("value")) {
        throw std::runtime_error("Missing duration.value in JSON element.");
    }
    int seconds = elem["duration"]["value"].i();

    // 7) Convert to minutes (rounded)
    int minutes = static_cast<int>(std::round(seconds / 60.0));
    return minutes;
}


std::pair<int, std::vector<int>> findRoute(std::vector<Coord>& nodes, std::vector<std::vector<int>>& adj, std::unordered_map<int, int>& sourceToDest, std::unordered_map<int, int>& destToSource, std::unordered_set<int>& sourceSet, std::unordered_set<int>& destSet) {
    using namespace std;
    // time, node, visited set, and path 
    using nodeType = tuple<int, int, unordered_set<int>, vector<int>>;
    
    auto cmp = [] (nodeType& a, nodeType& b) -> bool {
        return get<0>(a) > get<0>(b); 
    };

    priority_queue<nodeType, vector<nodeType>, decltype(cmp)> q(cmp);
    unordered_map<pair<int, int>, int, nodeHash> storedTimes; 

    q.push({0, 0, unordered_set<int>(), vector<int>(1, 0)}); 
    while (!q.empty()) {
        auto [cTime, cNode, cSet, cPath] = q.top();
        q.pop();

        for (auto neighbor : adj[cNode]) {
            if (cSet.count(neighbor)) continue; 
            if (destSet.count(neighbor) && !cSet.count(destToSource[neighbor])) continue; 
            if (!storedTimes.count({cNode, neighbor})) {
                storedTimes[{cNode, neighbor}] = getTime(nodes[cNode], nodes[neighbor]);
            }
            int newTime = cTime; auto newSet = cSet; auto newPath = cPath; 
            // Add time to neighbor onto current time
            newTime += storedTimes[{cNode, neighbor}];
            // Add neighbor to visited nodes + onto path 
            newSet.insert(neighbor); newPath.push_back(neighbor);
            // End BFS if all passengers have been dropped
            if (newSet.size() >= adj.size()-1) return {newTime, newPath}; 

            q.push({newTime, neighbor, newSet, newPath});
        }
    }

    return {-1, {}};
}

int main()
{
    const auto PORT = std::stoi(Utils::GetEnv("PORT", "8000"));

    crow::App<crow::CORSHandler> app;
    
    CROW_ROUTE(app, "/get-data").methods("POST"_method)(
        [](const crow::request& req){
            std::cout << "Raw POST body: " << req.body << "\n";

    // parse JSON 
    auto j = crow::json::load(req.body);
    if (!j) {
        std::cerr << "Invalid JSON\n";
        return crow::response(400, "Bad JSON");
    }
    std::cout << "Parsed JSON: " << j << "\n";

    std::vector<Coord> nodes;
    std::unordered_map<Coord,int,CoordHash> indexOf;
    std::vector<std::pair<std::pair<double,double>,std::pair<double,double>>> orderedPaxList;
    std::vector<std::pair<double,double>> orderedDriList;
    // extract passengers 
    if (j.has("passengers") && j["passengers"].t() == crow::json::type::List) {
        auto& paxList = j["passengers"];
        std::cout << "Got " << paxList.size() << " passenger entries\n";

        // each entry is itself a 2-element list of [lat,lng] pairs
        for (size_t i = 0; i < paxList.size(); ++i) {
            auto& pairArr = paxList[i];  // this is also an rvalue[List]
            if (pairArr.size() != 2) continue;
                // pull out the two coords
                std::pair<double,double> srcCoords = {pairArr[0][0].d(), pairArr[0][1].d()};
                std::pair<double,double> destCoords = {pairArr[1][0].d(), pairArr[1][1].d()};
                std::pair<std::pair<double,double>,std::pair<double,double>> passengerCoords = {srcCoords, destCoords};
                orderedPaxList.push_back(passengerCoords);
        }
    }
    else {
        std::cout << "No passengers array found\n";
    }

        // extract drivers
    if (j.has("drivers") && j["drivers"].t() == crow::json::type::List) {
        auto& driList = j["drivers"];
        std::cout << "Got " << driList.size() << " driver entries\n";

        // each entry is itself a one element list of [lat,lng] pairs
        for (size_t i = 0; i < driList.size(); ++i) {
            auto& pairArr = driList[i];  // this is also an rvalue[List]

                // pull out just one coord
                std::pair<double,double> srcCoords = {pairArr[0].d(), pairArr[1].d()};
                orderedDriList.push_back(srcCoords);
        }
    }
    else {
        std::cout << "No drivers array found\n";
    }


    //print out of orderedPaxList
    std::cout << "Print out of orderedPaxList: \n";
    for (int i = 0; i<orderedPaxList.size();i++){
        std::cout << "[(" << orderedPaxList[i].first.first << ", " << orderedPaxList[i].first.second << "), " << "(" << orderedPaxList[i].second.first << ", " << orderedPaxList[i].second.second << ")]\n";
    }
    //consructing of adjacencylist 
    //1) insert drivers 
    for (auto const &drv : orderedDriList) {
        Coord c{ drv.first, drv.second };
        if (indexOf.find(c) == indexOf.end()) {
            int idx = static_cast<int>(nodes.size());
            nodes.push_back(c);
            indexOf[c] = idx;
        }
    }
    int D = static_cast<int>(nodes.size()); 
    // insert passengers src
    for (auto const &pr : orderedPaxList) {
        auto const &srcPair = pr.first;
        Coord c{ srcPair.first, srcPair.second };
        if (indexOf.find(c) == indexOf.end()) {
            int newIdx = static_cast<int>(nodes.size());
            nodes.push_back(c);
            indexOf[c] = newIdx;
        }
    }
    int totalAfterSrc = static_cast<int>(nodes.size());
    int P = totalAfterSrc - D;  
    // P = number of unique passenger‐src indices 
    // (these occupy [D .. D+P-1]).

    //insert all passenger‐dst coordinates:
    for (auto const &pr : orderedPaxList) {
        auto const &dstPair = pr.second;
        Coord c{ dstPair.first, dstPair.second };
        if (indexOf.find(c) == indexOf.end()) {
            int newIdx = static_cast<int>(nodes.size());
            nodes.push_back(c);
            indexOf[c] = newIdx;
        }
    }
    std::unordered_map<int, int> sourceToDest;
    std::unordered_map<int, int> destToSource;
    std::unordered_set<int> sourceSet;
    std::unordered_set<int> destSet;

    //constructing 2 maps between source and dest and dest and source 
    for (auto const &pr : orderedPaxList){
        auto const &srcPair = pr.first;
        auto const &dstPair = pr.second;
        Coord src{ srcPair.first, srcPair.second };
        Coord dest{ dstPair.first, dstPair.second };
        auto const srcIndex = indexOf[src];
        auto const dstIndex = indexOf[dest];
        sourceSet.insert(srcIndex);
        destSet.insert(dstIndex);
        sourceToDest[srcIndex] = dstIndex;
        destToSource[dstIndex] = srcIndex;
    }
    
    int N = static_cast<int>(nodes.size());
    int Q = N - (D + P);
    // Q = number of unique passenger‐dst indices 
    // (these occupy [D+P .. D+P+Q-1]).

    std::cout << "Total unique nodes (drivers + passenger src/dst): " << N << "\n";
    std::cout << "  Drivers: indices [0 .. " << (D - 1) << "]\n";
    std::cout << "  Passenger-src: indices [ " << D << " .. " << (D + P - 1) << " ]\n";
    std::cout << "  Passenger-dst: indices [ " << (D + P) << " .. " << (D + P + Q - 1) << " ]\n\n";

    std::vector<std::vector<int>> adj(N);
    //drivers 
    for (int i = 0; i < D; ++i){
        //driver i -> all passengers source
        for (int j = D; j < D + P; ++j){
            adj[i].push_back(j);
        }
    }

        //driver i -> all passengers dest
        // for (int j = D + P; j < D + P + Q;++j){
        //     adj[i].push_back(j);
        // }
    //passengers source and dest 
    for (int i = D; i < D + P + Q; ++i) {
            for (int j = D; j < D + P + Q; ++j){
                if (i == j) continue;
                adj[i].push_back(j);
        }
    }

// 5) Print for every node: its own (lat,lng), then all adjacent coords
    for (int i = 0; i < N; ++i) {
        const Coord &me = nodes[i];
        std::cout << "Node " << i << " (lat=" << me.lat
                  << ", lng=" << me.lng << "):\n";

        // Are we in the driver block or passenger block?
        if (i < D) {
            std::cout << "  [driver-node] -> Neighbors:\n";
        } else {
            std::cout << "  [passenger-node] -> Neighbors:\n";
        }

        for (int nb : adj[i]) {
            const Coord &c = nodes[nb];
            std::cout << "    -> Node " << nb
                      << " at (lat=" << c.lat
                      << ", lng=" << c.lng << ")\n";
        }
        std::cout << "\n";
    }


    auto [shortestTime, path] = findRoute(nodes, adj, sourceToDest, destToSource, sourceSet, destSet); 

    std::cout << "Shortest time: " << shortestTime << "\n";   
    std::cout << path.size() << "\n";   
    for (int i : path) {
        const Coord &me = nodes[i];
        std::cout << "Node " << i << " (lat=" << me.lat
                  << ", lng=" << me.lng << "):\n";

        // Are we in the driver block or passenger block?
        if (i < D) {
            std::cout << "  [driver-node] -> Neighbors:\n";
        } else {
            std::cout << "  [passenger-node] -> Neighbors:\n";
        }

        std::cout << "\n";
    }

    //int minutes0 = getTime(src0, dst0, token);
    //std::cout << "First time: " << minutes0 << "\n";
    crow::json::wvalue data;
    data["success"] = true;
    data["message"] = "Request handled properly";
    data["shortestTime"] = shortestTime;
    for (int i = 0; i < path.size(); i++) {
        data["path"][i][0] = nodes[path[i]].lng;
        data["path"][i][1] = nodes[path[i]].lat;
    }
    crow::response res(data);
  //  res.set_header("Content-Type", "application/json");
    return res;
    


    });
    //go to first node, add time to total time, calculate time from node's dest to next closest node, add to total time and repeat 
    // node map: (driver1, passenger1) -> time for that 
    // take driver go through all the paxNodes with dest, call getTime and store the result in map
    // then loop throug passenger paxNodes, taking the time from map adding it to total time, updating driver position to node's destination, and continue looping 
    //queue [node1, node2, ...]
    //visit first node, take it out of queue, update position to be at paxNodes dest, 
    // pq queue, of (total_time, node), minheap
    // pq.push({0, startigPos})
    // bestCostMap 
    // droppedPassengers
    // prevMap
    // while (!pq.empty()) 
    // pop -> curr
    // Has all passangers been dropped off -> break and store current path
    // push all adjacent, you push {curr.first + getTime(curr, adj)/ m[{curr, adj}], adj }
    // mark as visited, mark prev
    // reutrn path 

    app.port(PORT).multithreaded().run();

    return 0;
}
