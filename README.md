# Ad Prices Extension
This repository contains the code for the ad prices study.

## Setting up the repository
Get the code:
```
git clone git@gitlab.cs.washington.edu:ericzeng/ad-prices.git
```

## Database setup (using Docker)

```
docker run \
  --name ad-prices-postgres \
  -v /data/ad_prices_postgres:/var/lib/postgresql/data \
  -e PGDATA=/var/lib/postgresql/data/pgdata \
  -p 127.0.0.1:54323:5432 \
  -d \
  postgres:13
```

## Contents
`extension/`: Browser extension for client-side data collection
`server/`: Backend for storing data and hosting the study website