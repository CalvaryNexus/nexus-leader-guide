// Shared pieces for the print outputs: fonts, brand colors, the logo, and the navy header band with
// the corner stripes.
import fs from "node:fs";
import path from "node:path";
import { ClipPath, Defs, Font, G, Image, Polygon, Rect, Svg, Text, View } from "@react-pdf/renderer";
import type { Style } from "@react-pdf/types";
import { parseInline } from "../format";

export const C = {
  navy: "#1C326A",
  navyText: "#152864",
  stripe: "#3154BE",
  card: "#E7F2FE",
  cardLine: "#B2CDEB",
  ink: "#121625",
  inkSoft: "#55607A",
  paper2: "#F6F9FD",
  rule: "#DDE5F0",
  faint: "#8B93A8",
};

const root = process.cwd();
const font = (f: string) => path.join(root, "assets", "fonts", f);

let registered = false;
export function registerFonts() {
  if (registered) return;
  Font.register({
    family: "Poppins",
    fonts: [
      { src: font("Poppins-Regular.ttf"), fontWeight: 400 },
      { src: font("Poppins-Medium.ttf"), fontWeight: 500 },
      { src: font("Poppins-SemiBold.ttf"), fontWeight: 600 },
      { src: font("Poppins-Bold.ttf"), fontWeight: 700 },
    ],
  });
  Font.register({ family: "Archivo Black", src: font("ArchivoBlack-Regular.ttf") });
  // Never hyphenate leader-facing text.
  Font.registerHyphenationCallback((word) => [word]);
  registered = true;
}

let logo: Buffer | null = null;
export function logoWhite(): { data: Buffer; format: "png" } {
  logo ??= fs.readFileSync(path.join(root, "public", "nexus-logo-white.png"));
  return { data: logo, format: "png" };
}

export const LOGO_RATIO = 900 / 223;

/** Navy rounded band with the brand's diagonal accent stripes clipped into two corners. */
export function NavyBand({ width, height, radius = 4, stripe = 36, children }: { width: number; height: number; radius?: number; stripe?: number; children: React.ReactNode }) {
  return (
    <View style={{ width, height, position: "relative" }}>
      <Svg width={width} height={height} style={{ position: "absolute", top: 0, left: 0 }}>
        <Defs>
          <ClipPath id="band">
            <Rect x={0} y={0} width={width} height={height} rx={radius} ry={radius} />
          </ClipPath>
        </Defs>
        <G clipPath="url(#band)">
          <Rect x={0} y={0} width={width} height={height} fill={C.navy} />
          <Polygon points={`0,0 ${stripe},0 0,${stripe}`} fill={C.stripe} />
          <Polygon points={`${width},${height} ${width - stripe},${height} ${width},${height - stripe}`} fill={C.stripe} />
        </G>
      </Svg>
      {children}
    </View>
  );
}

/** Text with **bold** spans. */
export function Rich({ text, style, boldColor = C.ink }: { text: string; style?: Style; boldColor?: string }) {
  return (
    <Text style={style}>
      {parseInline(text).map((s, i) =>
        s.bold ? (
          <Text key={i} style={{ fontWeight: 600, color: boldColor }}>
            {s.text}
          </Text>
        ) : (
          s.text
        ),
      )}
    </Text>
  );
}

export { Image };

export function countPages(pdf: Buffer): number {
  return (pdf.toString("latin1").match(/\/Type\s*\/Page(?![s\w])/g) ?? []).length;
}
