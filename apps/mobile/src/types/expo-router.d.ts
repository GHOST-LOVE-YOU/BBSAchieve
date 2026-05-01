import "expo-router";

declare module "expo-router" {
  export namespace ExpoRouter {
    export interface __routes<T extends string | object = string> {
      hrefInputParams:
        | {
            pathname: "/explore";
            params?: Record<string, string | number | undefined | null | (string | number)[]>;
          }
        | {
            pathname: "/inbox-binding";
            params?: Record<string, string | number | undefined | null | (string | number)[]>;
          }
        | {
            pathname: "/";
            params?: Record<string, string | number | undefined | null | (string | number)[]>;
          }
        | {
            pathname: "/_sitemap";
            params?: Record<string, string | number | undefined | null | (string | number)[]>;
          }
        | {
            pathname: "/boards/[boardId]";
            params: { boardId: string };
          }
        | {
            pathname: "/threads/[threadId]";
            params: { threadId: string };
          };
      hrefOutputParams:
        | {
            pathname: "/explore";
            params?: Record<string, string | string[]>;
          }
        | {
            pathname: "/inbox-binding";
            params?: Record<string, string | string[]>;
          }
        | {
            pathname: "/";
            params?: Record<string, string | string[]>;
          }
        | {
            pathname: "/_sitemap";
            params?: Record<string, string | string[]>;
          }
        | {
            pathname: "/boards/[boardId]";
            params: { boardId: string };
          }
        | {
            pathname: "/threads/[threadId]";
            params: { threadId: string };
          };
      href:
        | string
        | {
            pathname: "/explore";
            params?: Record<string, string | number | undefined | null | (string | number)[]>;
          }
        | {
            pathname: "/inbox-binding";
            params?: Record<string, string | number | undefined | null | (string | number)[]>;
          }
        | {
            pathname: "/";
            params?: Record<string, string | number | undefined | null | (string | number)[]>;
          }
        | {
            pathname: "/_sitemap";
            params?: Record<string, string | number | undefined | null | (string | number)[]>;
          }
        | {
            pathname: "/boards/[boardId]";
            params: { boardId: string };
          }
        | {
            pathname: "/threads/[threadId]";
            params: { threadId: string };
          };
    }
  }
}
