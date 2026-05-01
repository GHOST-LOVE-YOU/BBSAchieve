jest.mock("./src/components/animated-icon", () => ({
  AnimatedSplashOverlay: () => null,
  AnimatedIcon: () => null,
}));

jest.mock("./src/components/app-tabs", () => {
  const { Slot } = require("expo-router");

  return function MockedAppTabs() {
    return Slot ? <Slot /> : null;
  };
});

afterEach(() => {
  jest.restoreAllMocks();
});
