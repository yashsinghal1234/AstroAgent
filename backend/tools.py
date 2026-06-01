import json
import math
import os
from datetime import datetime, time, date
import pytz
from geopy.geocoders import Nominatim
from timezonefinder import TimezoneFinder
from skyfield.api import load
from skyfield.framelib import ecliptic_frame

# Global variables/objects initialized on demand
tf = TimezoneFinder()
geolocator = Nominatim(user_agent="astroagent_app_2026")

ZODIAC_SIGNS = [
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
]

def get_zodiac_details(lon):
    lon = float(lon) % 360
    sign_idx = int(lon // 30)
    sign_name = ZODIAC_SIGNS[sign_idx]
    deg = lon % 30
    deg_int = int(deg)
    min_int = int((deg - deg_int) * 60)
    return {
        "sign": sign_name,
        "degrees": deg_int,
        "minutes": min_int,
        "longitude": round(lon, 4),
        "formatted": f"{sign_name} {deg_int}°{min_int:02d}'"
    }

# --- Geocoding Tool ---
def geocode_place(place_name: str):
    """
    Resolve a place name into latitude, longitude, and local timezone name.
    """
    try:
        location = geolocator.geocode(place_name, timeout=10)
        if not location:
            return {"success": False, "error": f"Could not find place: {place_name}"}
        
        lat = location.latitude
        lng = location.longitude
        
        # Look up timezone
        tz_name = tf.timezone_at(lng=lng, lat=lat)
        if not tz_name:
            tz_name = "UTC" # Fallback
            
        return {
            "success": True,
            "place_name": location.address,
            "lat": lat,
            "lng": lng,
            "timezone": tz_name
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

# --- Astronomical Calculations Tool ---
def compute_birth_chart(birth_date: str, birth_time: str, lat: float, lng: float, timezone_name: str):
    """
    Given a birth date (YYYY-MM-DD), birth time (HH:MM), latitude, longitude,
    and timezone name, calculate precise planetary and house placements.
    """
    try:
        # Parse inputs
        byear, bmonth, bday = map(int, birth_date.split("-"))
        bhour, bmin = map(int, birth_time.split(":"))
        
        # Convert local time to UTC
        local_tz = pytz.timezone(timezone_name)
        local_dt = local_tz.localize(datetime(byear, bmonth, bday, bhour, bmin))
        utc_dt = local_dt.astimezone(pytz.utc)
        
        # Initialize Skyfield
        ts = load.timescale()
        # Load small DE421 ephemeris (downloads automatically on first run, cached locally)
        eph = load('de421.bsp')
        earth = eph['earth']
        
        # Skyfield time
        t = ts.utc(utc_dt.year, utc_dt.month, utc_dt.day, utc_dt.hour, utc_dt.minute, utc_dt.second)
        
        planets_data = {}
        bodies = {
            "Sun": eph['sun'],
            "Moon": eph['moon'],
            "Mercury": eph['mercury'],
            "Venus": eph['venus'],
            "Mars": eph['mars'],
            "Jupiter": eph['jupiter_barycenter'],
            "Saturn": eph['saturn_barycenter']
        }
        
        # Compute positions for standard bodies
        for name, body in bodies.items():
            astrometric = earth.at(t).observe(body)
            lat_ecl, lon_ecl, _ = astrometric.frame_latlon(ecliptic_frame)
            lon_deg = lon_ecl.degrees
            planets_data[name] = get_zodiac_details(lon_deg)
            
        # Compute Rahu and Ketu (Lunar Nodes) using high-precision Mean Node formula
        # Julian Date
        jd = t.tt
        T = (jd - 2451545.0) / 36525.0
        rahu_lon = (125.044522 - 1934.136261 * T + 0.0020708 * T**2 + 0.0000022 * T**3) % 360
        ketu_lon = (rahu_lon + 180) % 360
        
        planets_data["Rahu"] = get_zodiac_details(rahu_lon)
        planets_data["Ketu"] = get_zodiac_details(ketu_lon)
        
        # Compute Ascendant (Lagna)
        # Calculate obliquity of ecliptic (e)
        e_rad = math.radians(23.4392911 - 46.8150 * T / 3600.0)
        # Greenwich Mean Sidereal Time (GMST) in degrees
        d = jd - 2451545.0
        gmst_deg = (280.46061837 + 360.98564736629 * d + 0.000387933 * T**2) % 360
        # Local Sidereal Time (LST)
        lst_deg = (gmst_deg + lng) % 360
        lst_rad = math.radians(lst_deg)
        lat_rad = math.radians(lat)
        
        # Ascendant calculation
        num = -math.cos(lst_rad)
        den = math.sin(e_rad) * math.tan(lat_rad) + math.cos(e_rad) * math.sin(lst_rad)
        asc_rad = math.atan2(num, den)
        asc_deg = math.degrees(asc_rad) % 360
        
        ascendant_details = get_zodiac_details(asc_deg)
        
        # Calculate Whole Sign Houses starting from Ascendant sign
        asc_sign_idx = int(asc_deg // 30)
        houses = {}
        for h in range(1, 13):
            house_sign_idx = (asc_sign_idx + h - 1) % 12
            house_sign_name = ZODIAC_SIGNS[house_sign_idx]
            houses[f"House {h}"] = {
                "sign": house_sign_name,
                "start_longitude": house_sign_idx * 30,
                "end_longitude": ((house_sign_idx + 1) * 30) % 360
            }
            
        # Determine house placement for each planet
        for p_name, p_val in planets_data.items():
            p_lon = p_val["longitude"]
            p_sign_idx = int(p_lon // 30)
            # House index is distance of planet sign from ascendant sign (1-based)
            p_house = (p_sign_idx - asc_sign_idx) % 12 + 1
            planets_data[p_name]["house"] = p_house
            
        return {
            "success": True,
            "ascendant": ascendant_details,
            "planets": planets_data,
            "houses": houses,
            "julian_date": jd
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

# --- Daily Transits Tool ---
def get_daily_transits(transit_date: str, lat: float, lng: float):
    """
    Get planetary transits for a specific date (YYYY-MM-DD) and calculate how they fall into
    the user's natal chart houses (based on natal ascendant).
    """
    try:
        tyear, tmonth, tday = map(int, transit_date.split("-"))
        ts = load.timescale()
        eph = load('de421.bsp')
        earth = eph['earth']
        
        # Compute transit positions at noon UTC
        t = ts.utc(tyear, tmonth, tday, 12, 0, 0)
        
        bodies = {
            "Sun": eph['sun'],
            "Moon": eph['moon'],
            "Mercury": eph['mercury'],
            "Venus": eph['venus'],
            "Mars": eph['mars'],
            "Jupiter": eph['jupiter_barycenter'],
            "Saturn": eph['saturn_barycenter']
        }
        
        transit_planets = {}
        for name, body in bodies.items():
            astrometric = earth.at(t).observe(body)
            _, lon_ecl, _ = astrometric.frame_latlon(ecliptic_frame)
            transit_planets[name] = get_zodiac_details(lon_ecl.degrees)
            
        # Add Rahu and Ketu
        jd = t.tt
        T = (jd - 2451545.0) / 36525.0
        rahu_lon = (125.044522 - 1934.136261 * T + 0.0020708 * T**2 + 0.0000022 * T**3) % 360
        ketu_lon = (rahu_lon + 180) % 360
        
        transit_planets["Rahu"] = get_zodiac_details(rahu_lon)
        transit_planets["Ketu"] = get_zodiac_details(ketu_lon)
        
        return {
            "success": True,
            "date": transit_date,
            "planets": transit_planets
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

# --- Knowledge RAG Lookup Tool ---
def knowledge_lookup(query: str):
    """
    Lookup traditional astrological knowledge for grounding interpretations.
    Searches backend/knowledgebase.json for keywords.
    """
    try:
        kb_path = os.path.join(os.path.dirname(__file__), "knowledgebase.json")
        if not os.path.exists(kb_path):
            return {"error": "Knowledgebase file not found."}
            
        with open(kb_path, "r", encoding="utf-8") as f:
            kb = json.load(f)
            
        results = []
        query_lower = query.lower()
        
        # Search planets
        for key, val in kb.get("planets", {}).items():
            if key.lower() in query_lower or "planet" in query_lower:
                results.append(f"Planet {key}: {val}")
                
        # Search signs
        for key, val in kb.get("signs", {}).items():
            if key.lower() in query_lower or "sign" in query_lower:
                results.append(f"Sign {key}: {val}")
                
        # Search houses
        for key, val in kb.get("houses", {}).items():
            # Match e.g. "1st", "2nd", "House 1"
            if f"{key} house" in query_lower or f"house {key.replace('st','').replace('nd','').replace('rd','').replace('th','')}" in query_lower:
                results.append(f"{key} House: {val}")
            elif "house" in query_lower and len(results) < 3: # Fallback top houses
                results.append(f"{key} House: {val}")
                
        # Return top 3 matches
        return {
            "success": True,
            "matches": results[:4]
        }
    except Exception as e:
        return {"success": False, "error": str(e)}
