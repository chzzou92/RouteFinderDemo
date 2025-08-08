#include "crow_all.h"
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
// #include "env.h"

// const std::string token = GOOGLE_API_KEY;

struct Coord
{
    double lat, lng;
    enum class Role
    {
        Driver,
        PassengerSrc,
        PassengerDst
    } role;
    bool operator==(Coord const &o) const
    {
        return lat == o.lat && lng == o.lng && role == o.role;
    }
};
struct CoordHash
{
    std::size_t operator()(Coord const &c) const noexcept
    {
        size_t h1 = std::hash<double>()(c.lat);
        size_t h2 = std::hash<double>()(c.lng);
        size_t h3 = std::hash<int>()(static_cast<int>(c.role));
        return h1 ^ (h2 << 1) ^ (h3 << 2);
    }
};
struct PairCoordHash
{
    std::size_t operator()(std::pair<Coord, Coord> const &p) const noexcept
    {
        // Reuse CoordHash on each element
        CoordHash ch;
        std::size_t h1 = ch(p.first);
        std::size_t h2 = ch(p.second);
        // Combine them (XOR + shift is a common simple mix)
        return h1 ^ (h2 << 1);
    }
};

struct nodeHash
{
    std::size_t operator()(const std::pair<int, int> &p) const
    {
        return std::hash<int>{}(p.first) ^ (std::hash<int>{}(p.second) << 1);
    }
};

struct PathHash
{
    std::size_t operator()(const std::pair<int, std::vector<int>> &p) const
    {
        std::size_t seed = std::hash<int>{}(p.first);
        for (int v : p.second)
        {
            seed ^= std::hash<int>{}(v) + 0x9e3779b9 + (seed << 6) + (seed >> 2);
        }
        return seed;
    }
};

struct PathEqual
{
    bool operator()(const std::pair<int, std::vector<int>> &a,
                    const std::pair<int, std::vector<int>> &b) const
    {
        return a.first == b.first && a.second == b.second;
    }
};

struct RoutingContext
{
    std::unordered_map<std::pair<int, int>, int, nodeHash> storedTimes;
    int numOfDrivers;
    int numOfPassengerSources;
    int numOfPassengerDest;
    std::unordered_map<int, int> sourceToDest;
    std::unordered_map<int, int> destToSource;
    std::unordered_set<int> sourceSet;
    std::unordered_set<int> destSet;
    std::vector<Coord> nodes;
};
// helper to print roles
std::string roleToString(Coord::Role role)
{
    switch (role)
    {
    case Coord::Role::Driver:
        return "Driver";
    case Coord::Role::PassengerSrc:
        return "PassengerSrc";
    case Coord::Role::PassengerDst:
        return "PassengerDst";
    default:
        return "Unknown";
    }
}
// A small helper to capture libcurl’s response into a std::string
static size_t _curlWrite(void *buf, size_t size, size_t nmemb, void *up)
{
    std::string *resp = static_cast<std::string *>(up);
    resp->append(static_cast<char *>(buf), size * nmemb);
    return size * nmemb;
}

//  Simple HTTP GET (you already had this):
std::string httpGet(const std::string &url)
{
    CURL *curl = curl_easy_init();
    std::string response;
    curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, _curlWrite);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, &response);
    curl_easy_perform(curl);
    curl_easy_cleanup(curl);
    return response;
}

// HTTP POST that sends a JSON body & returns the response body as a string
std::string httpPost(const std::string &url, const std::string &jsonBody)
{
    CURL *curl = curl_easy_init();
    std::string response;

    curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
    curl_easy_setopt(curl, CURLOPT_POST, 1L);
    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, jsonBody.c_str());
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, _curlWrite);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, &response);

    struct curl_slist *headers = nullptr;
    headers = curl_slist_append(headers, "Content-Type: application/json");
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);

    curl_easy_perform(curl);

    curl_slist_free_all(headers);
    curl_easy_cleanup(curl);
    return response;
}

// should be in a sep file
//   getTime uses Google’s Routes API
int getTime(const Coord &start, const Coord &end)
{
    // 1) Build the Distance Matrix GET URL
    const char *key = std::getenv("GOOGLE_API_KEY");
    if (!key)
    {
        std::cerr << "Missing GOOGLE_API_KEY env variable!" << std::endl;
        std::exit(1);
    }
    std::ostringstream qs;
    qs << "https://maps.googleapis.com/maps/api/distancematrix/json"
       << "?destinations=" << end.lat << "%2C" << end.lng
       << "&origins=" << start.lat << "%2C" << start.lng
       << "&key=" << key;

    std::string url = qs.str();

    // 2) Perform the HTTP GET
    std::string body = httpGet(url);

    // 3) Parse JSON with Crow
    auto j = crow::json::load(body);
    if (!j)
    {
        throw std::runtime_error("Invalid JSON from Google Distance Matrix.");
    }
    // 4) Check top‐level status
    if (!j.has("status") || j["status"].s() != "OK")
    {
        std::ostringstream err;
        err << "Distance Matrix API status: "
            << (j.has("status") ? j["status"].s() : std::string("MISSING"))
            << "\nFull JSON:\n"
            << j;
        throw std::runtime_error(err.str());
    }

    // 5) Drill down: rows → elements
    if (!j.has("rows") ||
        !j["rows"][0].has("elements") ||
        !j["rows"][0]["elements"][0].has("status"))
    {
        std::ostringstream err;
        err << "Unexpected JSON structure (missing rows/elements/status). Full JSON:\n"
            << j;
        throw std::runtime_error(err.str());
    }

    auto &elem = j["rows"][0]["elements"][0];
    if (elem["status"].s() != "OK")
    {
        std::ostringstream err;
        err << "No route found (element.status=" << elem["status"].s() << ").\n"
            << "Full element JSON:\n"
            << elem;
        throw std::runtime_error(err.str());
    }

    // 6) Extract duration.value (seconds)
    if (!elem.has("duration") || !elem["duration"].has("value"))
    {
        throw std::runtime_error("Missing duration.value in JSON element.");
    }
    int seconds = elem["duration"]["value"].i();

    // 7) Convert to minutes (rounded)
    int minutes = static_cast<int>(std::round(seconds / 60.0));
    return minutes;
}

// another file
std::pair<int, std::vector<int>> findRoute(std::vector<std::vector<int>> &adj, int maxNodes, int driverIdx, RoutingContext &ctx)
{
    using namespace std;
    // time, node, visited set, and path
    using nodeType = tuple<int, int, unordered_set<int>, vector<int>, int>;

    auto cmp = [](nodeType &a, nodeType &b) -> bool
    {
        return get<0>(a) > get<0>(b);
    };

    priority_queue<nodeType, vector<nodeType>, decltype(cmp)> q(cmp);
    //  unordered_map<pair<int, int>, int, nodeHash> storedTimes;

    q.push({0, driverIdx, unordered_set<int>(), vector<int>(1, driverIdx), 0});
    while (!q.empty())
    {
        auto [cTime, cNode, cSet, cPath, cInCar] = q.top();
        q.pop();

        for (auto neighbor : adj[cNode])
        {
            if (ctx.sourceSet.count(neighbor) && cInCar == 4)
                continue;
            if (cSet.count(neighbor))
                continue;
            if (ctx.destSet.count(neighbor) && !cSet.count(ctx.destToSource[neighbor]))
                continue;
            if (!ctx.storedTimes.count({cNode, neighbor}))
            {
                ctx.storedTimes[{cNode, neighbor}] = getTime(ctx.nodes[cNode], ctx.nodes[neighbor]);
            }

            if (ctx.destSet.count(neighbor))
            {
                cInCar -= 1;
            }
            else
            {
                cInCar += 1;
            }
            int newTime = cTime;
            auto newSet = cSet;
            auto newPath = cPath;
            // Add time to neighbor onto current time
            newTime += ctx.storedTimes[{cNode, neighbor}];
            // Add neighbor to visited nodes + onto path
            newSet.insert(neighbor);
            newPath.push_back(neighbor);
            // End BFS if all passengers have been dropped
            if (newSet.size() >= maxNodes)
                return {newTime, newPath};

            q.push({newTime, neighbor, newSet, newPath, cInCar});
        }
    }
    for (const auto &pair : ctx.storedTimes)
    {
        std::cout << "(" << pair.first.first << ", " << pair.first.second << ") => " << pair.second << "\n";
    }
    return {-1, {}};
}
// another file
std::unordered_map<int, std::vector<int>> decipherRoutes(RoutingContext &ctx)
{
    std::cout << "[INFO] Entered decipherRoutes()\n";
    if (ctx.numOfDrivers == 1)
    {
        return {};
    }
    // storedTimes Driver -> source
    for (int i = 0; i < ctx.numOfDrivers; i++)
    {
        for (int source : ctx.sourceSet)
        {
            if (!ctx.storedTimes.count({i, source}))
            {
                ctx.storedTimes[{i, source}] = getTime(ctx.nodes[i], ctx.nodes[source]);
            }
        }
    }
    // storedTimes source -> dest
    for (int source : ctx.sourceSet)
    {
        for (int dest : ctx.destSet)
        {
            if (!ctx.storedTimes.count({source, dest}))
            {
                ctx.storedTimes[{source, dest}] = getTime(ctx.nodes[source], ctx.nodes[dest]);
            }
        }
    }

    // std::cout << "Stored Times (from -> to : time):\n";
    // for (const auto& [key, value] : ctx.storedTimes) {
    //     std::cout << "(" << key.first << " -> " << key.second << ") : " << value << "\n";
    // }
    // std::cout << "--------------------------------\n";

    // create Costmap, from passenger -> array of costs to take Driver X [driver index X, cost]
    std::unordered_map<int, std::vector<std::pair<int, int>>> costMap;
    for (int source : ctx.sourceSet)
    {
        std::vector<std::pair<int, int>> driverCosts;
        for (int i = 0; i < ctx.numOfDrivers; i++)
        {
            int toSrc = ctx.storedTimes[{i, source}];
            int toDst = ctx.storedTimes[{source, ctx.sourceToDest[source]}];
            int totalCost = toSrc + toDst;
            driverCosts.emplace_back(i, totalCost);
        }
        costMap[source] = driverCosts;
    }

    std::cout << "Cost Map (passenger source -> [(driver, cost)]):\n";
    for (const auto &[source, drivers] : costMap)
    {
        std::cout << "Passenger " << source << ": ";
        for (const auto &[driverIdx, cost] : drivers)
        {
            std::cout << "(" << driverIdx << ", " << cost << ") ";
        }
        std::cout << "\n";
    }
    std::cout << "--------------------------------\n";

    // delegate drivers
    //  res from driver -> array of passengers
    std::unordered_map<int, std::vector<int>> res;
    std::unordered_set<int> assignedSources;
    // assign each driver the route that has the lowest cost for them
    // so that each driver has at least one route
    for (int driver = 0; driver < ctx.numOfDrivers; ++driver)
    {
        int bestSource = -1;
        int bestCost = INT_MAX;

        for (const auto &[source, drivers] : costMap)
        {
            if (assignedSources.count(source))
                continue;

            int cost = drivers[driver].second;
            if (cost < bestCost)
            {
                bestCost = cost;
                bestSource = source;
            }
        }
        if (bestSource != -1)
        {
            res[driver].push_back(bestSource);
            assignedSources.insert(bestSource);
        }
    }
    // assign the rest
    for (const auto &[source, drivers] : costMap)
    {
        if (assignedSources.count(source))
            continue;
        auto best = std::min_element(drivers.begin(), drivers.end(),
                                     [](const std::pair<int, int> &a, const std::pair<int, int> &b)
                                     {
                                         return a.second < b.second;
                                     });
        int bestDriver = best->first;
        res[bestDriver].push_back(source);
        assignedSources.insert(source);
    }

    std::cout << "Driver Assignments (driver -> [passenger sources]):\n";
    for (const auto &[driver, passengers] : res)
    {
        std::cout << "Driver " << driver << ": ";
        for (int p : passengers)
        {
            std::cout << p << " ";
        }
        std::cout << "\n";
    }
    std::cout << "================================\n";

    return res;
};

int main()
{
    std::cout << Utils::GetEnv("PORT", "8000") << "\n";
    const auto PORT = std::stoi(Utils::GetEnv("PORT", "8000"));

    crow::App<crow::CORSHandler> app;
    auto &cors = app.get_middleware<crow::CORSHandler>();

    cors.global()
        .origin("*") // frontend host
        .headers(
            "Accept",
            "Origin",
            "Content-Type",
            "Authorization",
            "Refresh")
        .methods(
            crow::HTTPMethod::GET,
            crow::HTTPMethod::POST,
            crow::HTTPMethod::OPTIONS,
            crow::HTTPMethod::HEAD,
            crow::HTTPMethod::PUT,
            crow::HTTPMethod::DELETE);

    CROW_ROUTE(app, "/get-data").methods(crow::HTTPMethod::POST, crow::HTTPMethod::OPTIONS)([](const crow::request &req)
                                                                                            {
        // Handle preflight OPTIONS request
    if (req.method == crow::HTTPMethod::Options) {
        crow::response res(200);
        res.set_header("Access-Control-Allow-Origin", "*");
        res.set_header("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
        res.set_header("Access-Control-Allow-Headers", "Content-Type, Authorization");
        res.set_header("Access-Control-Max-Age", "86400");
        return res;
    }
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
        std::cout << "[(" << 
        orderedPaxList[i].first.first << ", " << 
        orderedPaxList[i].first.second << "), " << "(" << 
        orderedPaxList[i].second.first << ", " << 
        orderedPaxList[i].second.second << ")]\n";
    }

    
    
    //consructing of adjacencylist 
    //1) insert drivers 
    for (auto const &drv : orderedDriList) {
        Coord c{ drv.first, drv.second, Coord::Role::Driver };
        if (indexOf.find(c) == indexOf.end()) {
            int idx = static_cast<int>(nodes.size());
            nodes.push_back(c);
            indexOf[c] = idx;
        }
    }
    RoutingContext ctx;
    int D = static_cast<int>(nodes.size()); 
    ctx.numOfDrivers = D;

    // insert passengers src
    for (auto const &pr : orderedPaxList) {
        auto const &srcPair = pr.first;
        Coord c{ srcPair.first, srcPair.second, Coord::Role::PassengerSrc };
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
    ctx.numOfPassengerSources = P;
    //insert all passenger‐dst coordinates:
    for (auto const &pr : orderedPaxList) {
        auto const &dstPair = pr.second;
        Coord c{ dstPair.first, dstPair.second, Coord::Role::PassengerDst };
        if (indexOf.find(c) == indexOf.end()) {
            int newIdx = static_cast<int>(nodes.size());
            nodes.push_back(c);
            indexOf[c] = newIdx;
        }
    }
    ctx.nodes = nodes;

    std::unordered_map<int, int> sourceToDest;
    std::unordered_map<int, int> destToSource;
    std::unordered_set<int> sourceSet;
    std::unordered_set<int> destSet;

    //constructing 2 maps between source and dest and dest and source 
    for (auto const &pr : orderedPaxList){
        auto const &srcPair = pr.first;
        auto const &dstPair = pr.second;
        Coord src{ srcPair.first, srcPair.second, Coord::Role::PassengerSrc };
        Coord dest{ dstPair.first, dstPair.second, Coord::Role::PassengerDst };
        auto const srcIndex = indexOf[src];
        auto const dstIndex = indexOf[dest];
        sourceSet.insert(srcIndex);
        destSet.insert(dstIndex);
        sourceToDest[srcIndex] = dstIndex;
        destToSource[dstIndex] = srcIndex;
    }
    
    ctx.destSet = destSet;
    ctx.sourceSet = sourceSet;
    ctx.sourceToDest = sourceToDest;
    ctx.destToSource = destToSource;

    int N = static_cast<int>(nodes.size());
    int Q = N - (D + P);
    ctx.numOfPassengerDest = Q;

    auto assignmentRes = decipherRoutes(ctx);

    //setOfPaths [time, path] -> of each driver
    std::unordered_set<std::pair<int, std::vector<int>>, PathHash, PathEqual> setOfPaths;

    if (assignmentRes.empty()){
        std::cout << "it's empty";
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
                    << ", lng=" << me.lng << ", type=" << roleToString(me.role) << "):\n";

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
                        << ", lng=" << c.lng << ", type=" << roleToString(c.role) << ")\n";
            }
            std::cout << "\n";
        }

        std::cout << "=== sourceToDest Map ===\n";
        for (const auto& [src, dst] : sourceToDest) {
            std::cout << "  Source " << src << " -> Destination " << dst << "\n";
        }

        std::cout << "\n=== destToSource Map ===\n";
        for (const auto& [dst, src] : destToSource) {
            std::cout << "  Destination " << dst << " -> Source " << src << "\n";
        }
    auto [shortestTime, path] = findRoute(adj, adj.size(), 0, ctx);
    setOfPaths.insert({shortestTime, path});
    } else {
        for (const auto& [driverIdx, assignedSources] : assignmentRes) {
                //construct sub adj list 
                std::vector<std::vector<int>> currentSubAdj;
                currentSubAdj.resize(nodes.size());
                for (auto const& source : assignedSources){
                    //driver i -> all passengers source
                    currentSubAdj[driverIdx].push_back(source);
                }
                int assignedSourcesSize = assignedSources.size();
                //passenger source -> every other source / dest besides itself
                for (int i = 0; i < assignedSourcesSize; i++){
                    int src = assignedSources[i];
                    for (int j = 0; j < assignedSourcesSize; j++){
                        auto otherSrc = assignedSources[j];
                        int otherDest = sourceToDest[otherSrc];
                        if (i != j){
                            currentSubAdj[src].push_back(otherSrc);
                        }
                        currentSubAdj[src].push_back(otherDest);
                    }
                }
                //dest -> every source/dest besides itself 
                for (int i = 0; i < assignedSourcesSize; i++){
                    int dest = sourceToDest[assignedSources[i]];
                    for (int j = 0; j < assignedSourcesSize; j++){
                        int otherSrc = assignedSources[j];
                        int otherDest = sourceToDest[otherSrc];
                        if (i != j){
                            currentSubAdj[dest].push_back(otherDest);
                        }
                        currentSubAdj[dest].push_back(otherSrc);
                    }
                }
                
                std::cout << "=== Subgraph for Driver " << driverIdx << " ===\n";
                for (int i = 0; i < currentSubAdj.size(); ++i) {
                    // Only print nodes that have neighbors
                    if (currentSubAdj[i].empty()) continue;

                    const Coord &me = nodes[i];
                    std::cout << "Node " << i << " (lat=" << me.lat
                            << ", lng=" << me.lng << ", type=" << roleToString(me.role) << "):\n";

                    if (i < D) {
                        std::cout << "  [driver-node] -> Neighbors:\n";
                    } else {
                        std::cout << "  [passenger-node] -> Neighbors:\n";
                    }

                    for (int nb : currentSubAdj[i]) {
                        const Coord &c = nodes[nb];
                        std::cout << "    -> Node " << nb
                                << " at (lat=" << c.lat
                                << ", lng=" << c.lng << ", type=" << roleToString(c.role) << ")\n";
                    }
                    std::cout << "\n";
                }
                
                auto [shortestTime, path] = findRoute(currentSubAdj, assignedSourcesSize * 2, driverIdx, ctx);

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
                setOfPaths.insert({shortestTime, path});

            }
    }
    
    
   crow::json::wvalue data;
    data["success"] = true;
    data["message"] = "Request handled successfully";

    int pathIdx = 0;
    for (const auto& [shortestTime, path] : setOfPaths) {
        data["paths"][pathIdx]["shortestTime"] = shortestTime;
        for (int i = 0; i < path.size(); ++i) {
            data["paths"][pathIdx]["path"][i][0] = nodes[path[i]].lng;
            data["paths"][pathIdx]["path"][i][1] = nodes[path[i]].lat;
        }
        ++pathIdx;
    }

    crow::response res(data);
    return res; });
    // Health check endpoint for ALB
    CROW_ROUTE(app, "/health").methods(crow::HTTPMethod::Get)([](const crow::request &req)
                                                              {
            crow::json::wvalue response;
            response["status"] = "healthy";
            response["timestamp"] = std::time(nullptr);
            return crow::response(200, response); });

    // Optional: Add a simple root endpointx
    CROW_ROUTE(app, "/").methods(crow::HTTPMethod::Get)(
        [](const crow::request &req)
        {
            return crow::response(200, "Crow Backend Server is running! UPDATED SERVER!!!");
        });

    CROW_ROUTE(app, "/").methods(crow::HTTPMethod::Post, crow::HTTPMethod::Options)(
        [](const crow::request &req)
        {
            if (req.method == crow::HTTPMethod::Options)
            {
                auto res = crow::response();
                res.set_header("Access-Control-Allow-Origin", "*");
                res.set_header("Access-Control-Allow-Headers", "*");
                res.set_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
                res.set_header("Access-Control-Max-Age", "86400");
                res.set_header("Content-Length", "0");
                res.code = 200;
                return res;
            }
            crow::json::wvalue data;
            data["success"] = true;
            data["message"] = req.body;
            return crow::response(200, data);
        });

    CROW_CATCHALL_ROUTE(app)(
        [](const crow::request &req)
        {
            crow::response res;
            res.code = 200;
            res.body = "Catch-all response";
            res.set_header("Content-Length", std::to_string(res.body.length()));
            res.set_header("Content-Type", "text/plain");
            res.set_header("Connection", "close");
            return res;
        });

    app.port(PORT).multithreaded().run();

    return 0;
}
