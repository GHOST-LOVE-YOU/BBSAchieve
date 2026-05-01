jest.mock("./src/components/animated-icon", () => ({
  AnimatedSplashOverlay: () => null,
  AnimatedIcon: () => null,
}));

afterEach(() => {
  jest.restoreAllMocks();
});
