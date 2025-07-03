docker exec -it server-db bash
psql -U postgres
ALTER SYSTEM SET max_connections = 250;

docker restart server-db