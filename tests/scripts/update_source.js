const jsonBody = {
  jsonrpc: '2.0',
  id: 1,
  method: 'pokerinput_updateSource',
  params: {
    name: 'TestSource1',
    position: '1 1 1',
    inventory: [
      {
        nuclide: 'Cs-137',
        radioactivity: 2000000
      }
    ]
  }
};

console.log(JSON.stringify(jsonBody, null, 2));
