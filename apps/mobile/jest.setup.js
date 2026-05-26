jest.mock("./src/components/animated-icon", () => ({
  AnimatedSplashOverlay: () => null,
  AnimatedIcon: () => null,
}));

jest.mock("./src/components/app-tabs", () => {
  const { Stack } = require("expo-router");

  return function MockedAppTabs() {
    return (
      <Stack>
        <Stack.Screen name="index" />
        <Stack.Screen name="favorites" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="profile" />
      </Stack>
    );
  };
});

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

jest.mock("@kinde/expo", () => {
  const React = require("react");

  return {
    KindeAuthProvider: ({ children }) => <>{children}</>,
    useKindeAuth: () => ({
      getAccessToken: jest.fn(async () => "route-test-token"),
      getUserProfile: jest.fn(async () => null),
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
