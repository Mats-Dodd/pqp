
export const APP_CONFIG = {
  chat: {
    inputMinHeight: 1,
    inputMaxHeight: 10,
    inputDefaultHeight: 4
  },
  
  mcp: {
    defaultService: {
      serviceName: "filesystem",
      executable: "npx",
      args: [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/Users/matthewdodd/Documents"
      ]
    }
  },
  
  models: [
    "Claude 3 Opus",
    "Claude 3 Sonnet",
    "Claude 3 Haiku"
  ],
  
  styling: {
    accentColor: "#D6A97A"
  }
}; 