const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = +(process.env.AIRPORTFLOW_PORT || process.env.PORT || 8787);
const BASE = process.env.AERODATABOX_BASE_URL || "https://aerodatabox.p.rapidapi.com";
const HOST = process.env.AERODATABOX_RAPIDAPI_HOST || "aerodatabox.p.rapidapi.com";
const KEY = () => process.env.AERODATABOX_RAPIDAPI_KEY;
const CACHE_MS = +(process.env.FLIGHT_CACHE_MS || 300000);
const cache = new Map();

app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

function clean(v) {
  return v == null ? "" : String(v).trim();
}
function first(...values) {
  return values.find(v => v !== undefined && v !== null && String(v).trim() !== "") ?? "";
}
function time(v = "") {
  const str = clean(v);
  const m = str.match(/(?:T|\s)(\d{2}:\d{2})|^(\d{1,2}:\d{2})/);
  return m ? (m[1] || m[2]) : str;
}
function date(v = "") {
  return clean(v).match(/(\d{4}-\d{2}-\d{2})/)?.[1] || "";
}
function move(m = {}) {
  const a = m.airport || {};
  const scheduled = first(m.scheduledTime?.local, m.scheduledTimeLocal, m.scheduledTime?.utc);
  const revised = first(m.revisedTime?.local, m.revisedTimeLocal, m.predictedTime?.local);
  const actual = first(m.actualTime?.local, m.actualTimeLocal);
  return {
    airport: first(a.iata, a.icao),
    airportName: first(a.name, a.shortName),
    city: first(a.municipalityName, a.municipality),
    countryCode: first(a.countryCode),
    scheduledTime: time(scheduled),
    scheduledDate: date(scheduled),
    estimatedTime: time(revised),
    actualTime: time(actual),
    terminal: first(m.terminal),
    gate: first(m.gate),
    checkIn: first(m.checkInDesk, m.checkIn),
    baggage: first(m.baggageBelt, m.baggageCarousel, m.baggage),
  };
}
function norm(f, requested = "") {
  return {
    flightNumber: first(f.number, requested).replace(/\s/g, ""),
    airline: first(f.airline?.name),
    airlineCode: first(f.airline?.iata),
    status: first(f.status, "Scheduled"),
    aircraft: first(f.aircraft?.model, f.aircraft?.type),
    aircraftRegistration: first(f.aircraft?.reg, f.aircraft?.registration),
    departure: move(f.departure || {}),
    arrival: move(f.arrival || {}),
  };
}
function chicagoDate() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const get = type => parts.find(p => p.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

async function adb(path) {
  const started = Date.now();
  console.log(`[AeroDataBox] -> ${path}`);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(BASE + path, {
      headers: {
        "X-RapidAPI-Key": KEY(),
        "X-RapidAPI-Host": HOST,
        Accept: "application/json",
      },
      signal: controller.signal,
    });

    const raw = await response.text();
    let body = null;
    try { body = raw ? JSON.parse(raw) : null; } catch {}

    console.log(`[AeroDataBox] <- HTTP ${response.status} in ${Date.now() - started}ms`);

    if (!response.ok) {
      const e = new Error(body?.message || body?.detail || `AeroDataBox returned HTTP ${response.status}`);
      e.status = response.status;
      throw e;
    }
    return body;
  } catch (e) {
    const msg = e?.name === "AbortError"
      ? "AeroDataBox request timed out after 30 seconds."
      : e?.message || "AeroDataBox request failed.";
    console.error(`[AeroDataBox] ERROR after ${Date.now() - started}ms: ${msg}`);
    const err = new Error(msg);
    err.status = e?.status;
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

app.get("/api/flights/:n", async (req, res) => {
  if (!KEY()) return res.status(503).json({ error: "AirportFlow API key is not configured." });

  const n = String(req.params.n).toUpperCase().replace(/[^A-Z0-9]/g, "");
  const d = chicagoDate();
  const ck = `f:${n}:${d}`;
  const old = cache.get(ck);

  if (old && Date.now() - old.at < CACHE_MS) {
    console.log(`[AirportFlow] cache hit ${n} ${d}`);
    return res.json(old.data);
  }

  try {
    const body = await adb(`/flights/number/${n}/${d}?withAircraftImage=false&withLocation=false`);
    const list = Array.isArray(body) ? body : [];
    const f =
      list.find(x => clean(x.number).replace(/\s/g, "").toUpperCase() === n) ||
      list[0];

    if (!f) return res.status(404).json({ error: `No ${n} flight found for ${d}.` });

    const data = {
      flight: norm(f, n),
      fetchedAt: new Date().toISOString(),
    };

    cache.set(ck, { at: Date.now(), data });
    console.log(`[AirportFlow] success ${n}: ${data.flight.departure.airport} -> ${data.flight.arrival.airport}`);
    res.json(data);
  } catch (e) {
    console.error(`[AirportFlow] ${n} failed: ${e.message}`);
    res.status(e.status === 404 ? 404 : 502).json({ error: e.message });
  }
});

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    configured: Boolean(KEY()),
    serverTime: new Date().toISOString(),
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`AirportFlow API: http://0.0.0.0:${PORT}`);
  console.log(`Logging enabled. Flight provider timeout: 30 seconds.`);
});
