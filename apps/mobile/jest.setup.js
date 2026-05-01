jest.mock("./src/components/animated-icon", () => ({
  AnimatedSplashOverlay: () => null,
  AnimatedIcon: () => null,
}));

jest.mock("@/global.css", () => ({}));

afterEach(() => {
  jest.restoreAllMocks();
});
