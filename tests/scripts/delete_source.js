const jsonBody = {
  jsonrpc: '2.0',
  id: 1,
  method: 'pokerinput_deleteSource',
  params: {
    name: 'TestSource1'
  }
};

console.log(JSON.stringify(jsonBody, null, 2));
