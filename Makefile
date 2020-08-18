install:
	deno install -f --allow-read --allow-net --allow-run mod.ts

test:
	deno test --allow-read --allow-net --allow-run --allow-write