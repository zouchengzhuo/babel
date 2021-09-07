async function test() {
  return 1;
}

async function run() {
  return await test();
}

run();
