CREATE DATABASE ad_prices;

CREATE TABLE participant (
  id SERIAL PRIMARY KEY,
  prolific_id TEXT
  -- Demographics and other info go here
);

-- Extension instance
CREATE TABLE extension (
  e_id TEXT PRIMARY KEY,
  participant_id INTEGER REFERENCES participant(id)
  browser TEXT,
  browser_version TEXT,
  os TEXT
);

-- Page (references extension instance)
CREATE TABLE pages (
  id TEXT PRIMARY KEY,  --uuid generated
  page_url TEXT,
  e_id TEXT REFERENCES extension(e_id),
  cur_load INTEGER,  -- either load of 1 or 2
  time_loaded TIMESTAMPTZ
);

CREATE TABLE request_event (
  id SERIAL PRIMARY KEY,
  top_url TEXT,
  request_url TEXT,
  request_id TEXT,
  tab TEXT,
  referer_url TEXT,
  window_type TEXT,
  response_headers TEXT,
  response_code INTEGER,
  resource_type TEXT,
  method TEXT,
  response_time TIMESTAMPTZ,
  request_time TIMESTAMPTZ,
  request_headers TEXT,
  pages_id TEXT REFERENCES pages(id)
);

CREATE TABLE programmatic_cookie_event (
  id SERIAL PRIMARY KEY,
  top_url TEXT,
  setting_script_url TEXT,
  cookie_string TEXT,
  timestamp TIMESTAMPTZ,
  pages_id TEXT REFERENCES pages(id)
);

CREATE TABLE ad (
  id SERIAL PRIMARY KEY,
  e_id TEXT REFERENCES extension(e_id),
  timestamp TIMESTAMPTZ,
  parent_url TEXT,
  screenshot TEXT,
  html TEXT,
  textcontent TEXT,
  pages_id TEXT REFERENCES pages(id)
);

CREATE TABLE bids (
  id SERIAL PRIMARY KEY,
  e_id TEXT REFERENCES extension(e_id),
  ad_id INTEGER REFERENCES ad(id),
  cpm DECIMAL,
  currency TEXT,
  bidderCode TEXT,
  width INTEGER,
  height INTEGER,
  raw_json TEXT
);

CREATE TABLE winning_bids (
  id SERIAL PRIMARY KEY,
  e_id TEXT REFERENCES extension(e_id),
  ad_id INTEGER REFERENCES ad(id),
  cpm DECIMAL,
  currency TEXT,
  bidderCode TEXT,
  width INTEGER,
  height INTEGER,
  rendered BOOLEAN,  -- 1 if winning bid, 0 if ad info from prebid
  raw_json TEXT
);

CREATE TABLE exclude_reason (
  id SERIAL PRIMARY KEY,
  e_id TEXT REFERENCES extension(e_id),
  ad_id INTEGER REFERENCES ad(id),
  too_personal BOOLEAN,
  reveals_history BOOLEAN,
  incorrect BOOLEAN,
  other_reason TEXT,
  ad_description TEXT
);

CREATE TABLE relevance_survey (
  id SERIAL PRIMARY KEY,
  e_id TEXT REFERENCES extension(e_id),
  ad_id INTEGER REFERENCES ad(id),
  is_blank BOOLEAN,
  targeting_perception INTEGER,
  relevance INTEGER,
  retargeted TEXT,
  likely_to_click INTEGER
);
