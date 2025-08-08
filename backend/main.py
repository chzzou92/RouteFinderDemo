from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
import requests
import heapq
from typing import List, Set, Tuple, Dict, Any
from dotenv import load_dotenv
import sys
import uvicorn
from enum import Enum

# Load environment variables
load_dotenv()

app = FastAPI()

# Configure CORS to allow origins from environment variable
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
origins = [origin.strip() for origin in cors_origins]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["POST", "GET", "OPTIONS"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Hello from backend"}

class Role(Enum):
    Driver = 1
    PassengerSrc = 2
    PassengerDst = 3

class Coord:
    def __init__(self, lat: float, lng: float, role: Role):
        self.lat = lat
        self.lng = lng
        self.role = role
    def __eq__(self, other):
        if not isinstance(other, Coord):
            return False
        return (self.lat, self.lng, self.role) == (other.lat, other.lng, other.role)
    def __hash__(self):
        return hash((self.lat, self.lng, self.role))

class RoutingContext:
    def __init__(self):
        # storedTimes: (from_node, to_node) -> int
        self.storedTimes: Dict[Tuple[int, int], int] = {}

        self.numOfDrivers: int = 0
        self.numOfPassengerSources: int = 0
        self.numOfPassengerDest: int = 0

        # Maps source node to destination node
        self.sourceToDest: Dict[int, int] = {}

        # Maps destination node to source node
        self.destToSource: Dict[int, int] = {}

        self.sourceSet: Set[int] = set()
        self.destSet: Set[int] = set()

        # List of Coord objects, assumed you have Coord class or similar
        self.nodes: List['Coord'] = []

def roleToString(role: Role) -> str:
    if role == Role.Driver:
        return "Driver"
    elif role == Role.PassengerSrc:
        return "PassengerSrc"
    elif role == Role.PassengerDst:
        return "PassengerDst"
    return "Unknown"

def get_time(start: Coord, end: Coord) -> int:
    load_dotenv()  # loads from .env automatically
    key = os.getenv("GOOGLE_API_KEY")
    if not key:
        raise EnvironmentError("Missing GOOGLE_API_KEY env variable!")

    url = (
        "https://maps.googleapis.com/maps/api/distancematrix/json"
        f"?destinations={end.lat},{end.lng}"
        f"&origins={start.lat},{start.lng}"
        f"&key={key}"
    )

    response = requests.get(url)
    if response.status_code != 200:
        raise RuntimeError(f"Google API request failed with status {response.status_code}")

    data = response.json()

    if data.get("status") != "OK":
        raise RuntimeError(f"Distance Matrix API status: {data.get('status', 'MISSING')}\nFull JSON:\n{data}")

    try:
        elem = data["rows"][0]["elements"][0]
    except (IndexError, KeyError) as e:
        raise RuntimeError(f"Unexpected JSON structure (missing rows/elements/status). Full JSON:\n{data}") from e

    if elem.get("status") != "OK":
        raise RuntimeError(f"No route found (element.status={elem.get('status')}). Full element JSON:\n{elem}")

    duration = elem.get("duration")
    if not duration or "value" not in duration:
        raise RuntimeError("Missing duration.value in JSON element.")

    seconds = duration["value"]
    minutes = round(seconds / 60)
    return minutes

def find_route(
    adj: List[List[int]], 
    max_nodes: int, 
    driver_idx: int, 
    ctx: Any  # Expected to have .sourceSet, .destSet, .destToSource, .storedTimes, .nodes attributes
) -> Tuple[int, List[int]]:
    # Heap elements: (cTime, cNode, cSet, cPath, cInCar)
    # cSet: visited nodes as a set
    # cPath: path as list of nodes

    # Min-heap for priority queue
    q = []
    heapq.heappush(q, (0, driver_idx, set(), [driver_idx], 0))

    while q:
        cTime, cNode, cSet, cPath, cInCar = heapq.heappop(q)

        for neighbor in adj[cNode]:
            # Conditions to skip neighbors (like in C++ code)
            if neighbor in ctx.sourceSet and cInCar == 4:
                continue
            if neighbor in cSet:
                continue
            if neighbor in ctx.destSet and ctx.destToSource[neighbor] not in cSet:
                continue

            # Cache times if not already present
            edge = (cNode, neighbor)
            if edge not in ctx.storedTimes:
                ctx.storedTimes[edge] = get_time(ctx.nodes[cNode], ctx.nodes[neighbor])

            # Update cInCar count depending on whether neighbor is a destination or source
            new_cInCar = cInCar - 1 if neighbor in ctx.destSet else cInCar + 1

            newTime = cTime + ctx.storedTimes[edge]
            newSet = cSet.copy()
            newSet.add(neighbor)
            newPath = cPath + [neighbor]

            if len(newSet) >= max_nodes:
                return newTime, newPath

            heapq.heappush(q, (newTime, neighbor, newSet, newPath, new_cInCar))

    # Print stored times like the original code 
    for (from_node, to_node), time_val in ctx.storedTimes.items():
        print(f"({from_node}, {to_node}) => {time_val}")

    return -1, []

def decipherRoutes(ctx: RoutingContext) -> Dict[int, List[int]]:
    print("[INFO] Entered decipherRoutes()")
    if ctx.numOfDrivers == 1:
        return {}

    # storedTimes Driver -> source
    for i in range(ctx.numOfDrivers):
        for source in ctx.sourceSet:
            if (i, source) not in ctx.storedTimes:
                ctx.storedTimes[(i, source)] = get_time(ctx.nodes[i], ctx.nodes[source])

    # storedTimes source -> dest
    for source in ctx.sourceSet:
        for dest in ctx.destSet:
            if (source, dest) not in ctx.storedTimes:
                ctx.storedTimes[(source, dest)] = get_time(ctx.nodes[source], ctx.nodes[dest])

    # create costMap: passenger source -> list of (driver index, cost)
    costMap: Dict[int, List[Tuple[int, int]]] = {}
    for source in ctx.sourceSet:
        driverCosts: List[Tuple[int, int]] = []
        for i in range(ctx.numOfDrivers):
            toSrc = ctx.storedTimes[(i, source)]
            toDst = ctx.storedTimes[(source, ctx.sourceToDest[source])]
            totalCost = toSrc + toDst
            driverCosts.append((i, totalCost))
        costMap[source] = driverCosts

    print("Cost Map (passenger source -> [(driver, cost)]):")
    for source, drivers in costMap.items():
        print(f"Passenger {source}: ", end="")
        for driverIdx, cost in drivers:
            print(f"({driverIdx}, {cost}) ", end="")
        print()
    print("--------------------------------")

    # delegate drivers: result is driver -> list of passengers
    res: Dict[int, List[int]] = {i: [] for i in range(ctx.numOfDrivers)}
    assignedSources = set()

    # assign each driver the route with lowest cost for them so each driver has at least one route
    for driver in range(ctx.numOfDrivers):
        bestSource = -1
        bestCost = sys.maxsize

        for source, drivers in costMap.items():
            if source in assignedSources:
                continue
            cost = drivers[driver][1]
            if cost < bestCost:
                bestCost = cost
                bestSource = source
        if bestSource != -1:
            res[driver].append(bestSource)
            assignedSources.add(bestSource)

    # assign the rest
    for source, drivers in costMap.items():
        if source in assignedSources:
            continue
        bestDriver, _ = min(drivers, key=lambda x: x[1])
        res[bestDriver].append(source)
        assignedSources.add(source)

    print("Driver Assignments (driver -> [passenger sources]):")
    for driver, passengers in res.items():
        print(f"Driver {driver}: ", end="")
        for p in passengers:
            print(f"{p} ", end="")
        print()
    print("================================")

    return res

@app.post("/get-data")
async def get_data(request: Request):
    body = await request.json()
    print(f"Raw POST body: {body}")

    # Extract passengers
    orderedPaxList: List[Tuple[Tuple[float, float], Tuple[float, float]]] = []
    if "passengers" in body and isinstance(body["passengers"], list):
        paxList = body["passengers"]
        print(f"Got {len(paxList)} passenger entries")
        for entry in paxList:
            if len(entry) != 2:
                continue
            srcCoords = (entry[0][0], entry[0][1])
            destCoords = (entry[1][0], entry[1][1])
            orderedPaxList.append((srcCoords, destCoords))
    else:
        print("No passengers array found")

    # Extract drivers
    orderedDriList: List[Tuple[float, float]] = []
    if "drivers" in body and isinstance(body["drivers"], list):
        driList = body["drivers"]
        print(f"Got {len(driList)} driver entries")
        for entry in driList:
            if len(entry) != 2:
                continue
            srcCoords = (entry[0], entry[1])
            orderedDriList.append(srcCoords)
    else:
        print("No drivers array found")

    print("Print out of orderedPaxList:")
    for src, dst in orderedPaxList:
        print(f"[({src[0]}, {src[1]}), ({dst[0]}, {dst[1]})]")

    # Build nodes and indexOf map
    nodes: List[Coord] = []
    indexOf: Dict[Coord, int] = {}

    def add_coord(c: Coord):
        if c not in indexOf:
            idx = len(nodes)
            nodes.append(c)
            indexOf[c] = idx

    # Insert drivers
    for lat, lng in orderedDriList:
        c = Coord(lat=lat, lng=lng, role=Role.Driver)
        add_coord(c)

    ctx = RoutingContext()
    ctx.numOfDrivers = len(nodes)

    # Insert passenger sources
    for srcPair, _ in orderedPaxList:
        c = Coord(lat=srcPair[0], lng=srcPair[1], role=Role.PassengerSrc)
        add_coord(c)

    totalAfterSrc = len(nodes)
    P = totalAfterSrc - ctx.numOfDrivers
    ctx.numOfPassengerSources = P

    # Insert passenger destinations
    for _, dstPair in orderedPaxList:
        c = Coord(lat=dstPair[0], lng=dstPair[1], role=Role.PassengerDst)
        add_coord(c)

    ctx.nodes = nodes

    sourceToDest: Dict[int, int] = {}
    destToSource: Dict[int, int] = {}
    sourceSet: Set[int] = set()
    destSet: Set[int] = set()

    for srcPair, dstPair in orderedPaxList:
        src = Coord(lat=srcPair[0], lng=srcPair[1], role=Role.PassengerSrc)
        dest = Coord(lat=dstPair[0], lng=dstPair[1], role=Role.PassengerDst)
        srcIndex = indexOf[src]
        dstIndex = indexOf[dest]
        sourceSet.add(srcIndex)
        destSet.add(dstIndex)
        sourceToDest[srcIndex] = dstIndex
        destToSource[dstIndex] = srcIndex

    ctx.sourceSet = sourceSet
    ctx.destSet = destSet
    ctx.sourceToDest = sourceToDest
    ctx.destToSource = destToSource

    N = len(nodes)
    Q = N - (ctx.numOfDrivers + ctx.numOfPassengerSources)
    ctx.numOfPassengerDest = Q

    assignmentRes = decipherRoutes(ctx)

    setOfPaths = set()

    if not assignmentRes:
        print("Assignment result is empty")

        print(f"Total unique nodes (drivers + passenger src/dst): {N}")
        print(f"  Drivers: indices [0 .. {ctx.numOfDrivers - 1}]")
        print(f"  Passenger-src: indices [{ctx.numOfDrivers} .. {ctx.numOfDrivers + P - 1}]")
        print(f"  Passenger-dst: indices [{ctx.numOfDrivers + P} .. {ctx.numOfDrivers + P + Q - 1}]")

        adj: List[List[int]] = [[] for _ in range(N)]

        # drivers -> all passenger sources
        for i in range(ctx.numOfDrivers):
            for j in range(ctx.numOfDrivers, ctx.numOfDrivers + P):
                adj[i].append(j)

        # passenger source and dest connections
        for i in range(ctx.numOfDrivers, ctx.numOfDrivers + P + Q):
            for j in range(ctx.numOfDrivers, ctx.numOfDrivers + P + Q):
                if i != j:
                    adj[i].append(j)

        # Print adjacency info (optional: for debugging)
        for i in range(N):
            me = nodes[i]
            print(f"Node {i} (lat={me.lat}, lng={me.lng}, type={roleToString(me.role)}):")
            if i < ctx.numOfDrivers:
                print("  [driver-node] -> Neighbors:")
            else:
                print("  [passenger-node] -> Neighbors:")
            for nb in adj[i]:
                c = nodes[nb]
                print(f"    -> Node {nb} at (lat={c.lat}, lng={c.lng}, type={roleToString(c.role)})")
            print()

        print("=== sourceToDest Map ===")
        for src, dst in sourceToDest.items():
            print(f"  Source {src} -> Destination {dst}")

        print("=== destToSource Map ===")
        for dst, src in destToSource.items():
            print(f"  Destination {dst} -> Source {src}")

        shortestTime, path = find_route(adj, len(adj), 0, ctx)
        setOfPaths.add((shortestTime, tuple(path)))

    else:
        for driverIdx, assignedSources in assignmentRes.items():
            currentSubAdj = [[] for _ in range(len(nodes))]

            for source in assignedSources:
                currentSubAdj[driverIdx].append(source)

            assignedSourcesSize = len(assignedSources)

            for i in range(assignedSourcesSize):
                src = assignedSources[i]
                for j in range(assignedSourcesSize):
                    otherSrc = assignedSources[j]
                    otherDest = sourceToDest[otherSrc]
                    if i != j:
                        currentSubAdj[src].append(otherSrc)
                    currentSubAdj[src].append(otherDest)

            for i in range(assignedSourcesSize):
                dest = sourceToDest[assignedSources[i]]
                for j in range(assignedSourcesSize):
                    otherSrc = assignedSources[j]
                    otherDest = sourceToDest[otherSrc]
                    if i != j:
                        currentSubAdj[dest].append(otherDest)
                    currentSubAdj[dest].append(otherSrc)

            print(f"=== Subgraph for Driver {driverIdx} ===")
            for i, neighbors in enumerate(currentSubAdj):
                if not neighbors:
                    continue
                me = nodes[i]
                print(f"Node {i} (lat={me.lat}, lng={me.lng}, type={roleToString(me.role)}):")
                if i < ctx.numOfDrivers:
                    print("  [driver-node] -> Neighbors:")
                else:
                    print("  [passenger-node] -> Neighbors:")
                for nb in neighbors:
                    c = nodes[nb]
                    print(f"    -> Node {nb} at (lat={c.lat}, lng={c.lng}, type={roleToString(c.role)})")
                print()

            shortestTime, path = find_route(currentSubAdj, assignedSourcesSize * 2, driverIdx, ctx)

            print(f"Shortest time: {shortestTime}")
            print(len(path))
            for i in path:
                me = nodes[i]
                print(f"Node {i} (lat={me.lat}, lng={me.lng}):")
                if i < ctx.numOfDrivers:
                    print("  [driver-node] -> Neighbors:")
                else:
                    print("  [passenger-node] -> Neighbors:")
                print()

            setOfPaths.add((shortestTime, tuple(path)))

    # Build response JSON
    data = {
        "success": True,
        "message": "Request handled successfully",
        "paths": []
    }

    for shortestTime, path in setOfPaths:
        path_points = [[nodes[i].lng, nodes[i].lat] for i in path]
        data["paths"].append({
            "shortestTime": shortestTime,
            "path": path_points
        })

    return JSONResponse(content=data)


if __name__ == "__main__":
    import os
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port)
