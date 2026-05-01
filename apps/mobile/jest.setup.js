jest.mock("./src/components/animated-icon", () => ({
  AnimatedSplashOverlay: () => null,
  AnimatedIcon: () => null,
}));

jest.mock("@/global.css", () => ({}), { virtual: true });
jest.mock("@/assets/images/tabIcons/home.png", () => ({}), { virtual: true });
jest.mock("@/assets/images/tabIcons/explore.png", () => ({}), { virtual: true });
jest.mock("@/assets/images/logo-glow.png", () => ({}), { virtual: true });
jest.mock("@/assets/images/expo-logo.png", () => ({}), { virtual: true });

afterEach(() => {
  jest.restoreAllMocks();
});
