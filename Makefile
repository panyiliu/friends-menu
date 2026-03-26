up:
	docker compose up -d --build

down:
	docker compose down

logs:
	docker compose logs -f

shell:
	docker compose exec app sh

smoke-stage1:
	docker compose exec app node scripts/smoke-test-stage1.cjs

