const lib = require('../../lib/lib.js');

const ioMocks = require('../helpers/io-mocks.js');

test('create module with example, with `yarn --version` not working', async () => {
  // with snapshot info ignored in this test
  const ioInject = ioMocks([]);
  const ioInjected = {
    ...ioInject,
    execa: {
      commandSync: (command, _) => {
        if (/yarn/.test(command)) {
          throw new Error('command not found');
        }
      }
    }
  };

  const options = {
    name: 'alice-bettty',
    generateExample: true
  };

  let error;
  try {
    // expected to throw:
    await lib(options, ioInjected);
  } catch (e) {
    error = e;
  }
  expect(error).toBeDefined();
  expect(error.message).toMatch(
    `yarn --version failed; both react-native-cli and yarn CLI tools are needed to generate example project`);
});