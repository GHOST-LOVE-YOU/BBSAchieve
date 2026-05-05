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

jest.mock("@kinde/expo", () => {
  const React = require("react");

  return {
    KindeAuthProvider: ({ children }) => <>{children}</>,
    useKindeAuth: () => ({
      getAccessToken: jest.fn(async () => "route-test-token"),
      isAuthenticated: true,
      isLoading: false,
      login: jest.fn(async () => ({ success: true })),
      logout: jest.fn(async () => ({ success: true })),
      register: jest.fn(async () => ({ success: true })),
    }),
  };
});

afterEach(() => {
  jest.restoreAllMocks();
});
