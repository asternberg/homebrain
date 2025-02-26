/** @type {import('ts-jest').JestConfigWithTsJest} **/
module.exports = {
  testEnvironment: "node",
  transform: {
    '^.+\\.tsx?$': ["ts-jest",{}],
  }, transformIgnorePatterns: [
    // By default, node_modules is ignored. We override it here:
    'node_modules/(?!(p-limit|yocto-queue)/)',
  ],
};