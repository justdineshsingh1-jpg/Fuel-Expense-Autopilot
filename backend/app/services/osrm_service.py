import httpx
from typing import List, Tuple

OSRM_BASE_URL = "https://router.project-osrm.org"

async def calculate_route_distance(waypoints: List[Tuple[float, float]]) -> dict:
    if len(waypoints) < 2:
        return {"distance_km": 0, "duration_seconds": 0}
    
    coords = ";".join([f"{lng},{lat}" for lng, lat in waypoints])
    
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{OSRM_BASE_URL}/route/v1/driving/{coords}",
            params={
                "overview": "false",
                "alternatives": "false",
            }
        )
        data = response.json()
        
        if data.get("code") != "Ok":
            raise ValueError(f"OSRM API error: {data.get('message', 'Unknown error')}")
        
        route = data["routes"][0]
        return {
            "distance_km": round(route["distance"] / 1000, 1),
            "duration_seconds": route["duration"]
        }

async def validate_distance(claimed_km: float, waypoints: List[Tuple[float, float]], threshold_percent: float = 15.0) -> dict:
    osrm_result = await calculate_route_distance(waypoints)
    osrm_km = osrm_result["distance_km"]
    
    if osrm_km == 0:
        return {
            "osrm_km": 0,
            "variance_percent": 0,
            "is_flagged": False,
            "flag_reason": None
        }
    
    variance = ((claimed_km - osrm_km) / osrm_km) * 100
    is_flagged = variance > threshold_percent
    
    return {
        "osrm_km": osrm_km,
        "variance_percent": round(variance, 2),
        "is_flagged": is_flagged,
        "flag_reason": f"Claimed {claimed_km} km vs OSRM {osrm_km} km ({variance:.1f}% excess)" if is_flagged else None
    }
