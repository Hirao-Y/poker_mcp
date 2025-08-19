const jsonBody = {
  jsonrpc: '2.0',
  id: 1,
  method: 'pokerinput_proposeSource',
  params: {
    name: 'TestSource1',
    type: 'POINT',
    position: '0 0 0',
    inventory: [
      {
        nuclide: 'Co-60',
        radioactivity: 1000000
      }
    ],
    cutoff_rate: 0.0001
  }
};

console.log(JSON.stringify(jsonBody, null, 2));
