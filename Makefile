all: build up

build:
	docker-compose build

up:
	docker-compose up -d

down:
	docker-compose down

logs:
	docker-compose logs -f

clean: down
	docker-compose down -v

fclean: down
	docker-compose down -v --rmi all
	docker system prune -af --volumes

re: fclean build up

restart: down up

backend-logs:
	docker-compose logs -f backend

nginx-logs:
	docker-compose logs -f nginx

shell-backend:
	docker-compose exec backend /bin/sh

shell-nginx:
	docker-compose exec nginx /bin/sh

dev:
	docker compose -f docker-compose.dev.yml up --build -d

dev-down:
	docker compose -f docker-compose.dev.yml down

dev-logs:
	docker compose -f docker-compose.dev.yml logs -f

.PHONY: all build up down logs clean fclean re dev dev-down dev-logs