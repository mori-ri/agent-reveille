import React from "react";
import { Box, Text } from "ink";

export function Banner({ version }: { version?: string }) {
  return (
    <Box flexDirection="column">
      <Text>
        <Text color="yellow">{"   █"}</Text>
        <Text backgroundColor="yellow" color="white">{" ● ●"}</Text>
        <Text color="yellow">{"█"}</Text>
        <Text>{"      "}</Text>
        <Text color="yellow">{"♪"}</Text>
      </Text>
      <Text>
        <Text color="yellow">{"   ████"}</Text>
        <Text backgroundColor="black" color="white">{" ==<<"}</Text>
        <Text>{"   "}</Text>
        <Text bold>{"r e v e i l l e"}</Text>
        {version && <Text color="gray">{" v" + version}</Text>}
      </Text>
      <Text>
        <Text color="yellow">{"   ▀▀▀▀▀▀"}</Text>
        <Text>{"     "}</Text>
        <Text color="yellow">{"♫"}</Text>
      </Text>
    </Box>
  );
}
