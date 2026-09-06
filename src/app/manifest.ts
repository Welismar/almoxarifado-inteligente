import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Stockwise | Almoxarifado inteligente",
    short_name: "Stockwise",
    description: "Gestão de almoxarifado para construção civil.",
    start_url: "/login",
    display: "standalone",
    background_color: "#f7faf8",
    theme_color: "#155f58",
    lang: "pt-BR",
  };
}
