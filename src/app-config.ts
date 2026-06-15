export interface VisualDependencyConfig {
  id: string;
  label: string;
  fileName: string;
  targetDirectory: string;
  stripRootDirectory?: string;
  expectedExtension: string;
}

export class AppConfig {
  static readonly visualDependenciesEndpoint = "http://public.cryon.cloud";

  static readonly visualDependencies: VisualDependencyConfig[] = [
    {
      id: "minifaces",
      label: "Player minifaces",
      fileName: "minifaces.zip",
      targetDirectory: "minifaces",
      stripRootDirectory: "minifaces",
      expectedExtension: ".dds"
    }
  ];

  static dependencyUrl(fileName: string): string {
    const endpoint = AppConfig.visualDependenciesEndpoint.endsWith("/")
      ? AppConfig.visualDependenciesEndpoint
      : `${AppConfig.visualDependenciesEndpoint}/`;
    return new URL(fileName.replace(/^\/+/, ""), endpoint).toString();
  }
}
