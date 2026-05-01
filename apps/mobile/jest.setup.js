jest.mock("./src/components/animated-icon", () => ({
  AnimatedSplashOverlay: () => null,
  AnimatedIcon: () => null,
}));

jest.mock("./src/components/app-tabs", () => () => null);

afterEach(() => {
  jest.restoreAllMocks();
});
