install:
	deno install --global -f --allow-read --allow-net --allow-sys --allow-write mod.ts

test:
	deno test --allow-read --allow-net --allow-sys --allow-write --allow-run