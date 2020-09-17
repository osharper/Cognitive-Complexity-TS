import { FileOutput, FolderOutput } from "../../../shared/types";

export function compareOutputs(
    left: FileOutput | FolderOutput,
    right: FileOutput | FolderOutput
): number {
    const leftScore = left.score;
    const rightScore = right.score;

    const leftIsFolder = typeof leftScore === "number";
    const rightIsFolder = typeof rightScore === "number";

    if (leftIsFolder && rightIsFolder) {
        // If the typeof statements were directly in the if condition,
        // the casting would not be required by TypeScript.
        return (rightScore as number) - (leftScore as number);
    }

    if (!leftIsFolder && !rightIsFolder) {
        return 0;
    }

    // folders should be at the bottom of the complexity list

    if (!leftIsFolder) {
        return -1;
    }

    if (!rightIsFolder) {
        return -1;
    }

    return 0; // unreachable
}
