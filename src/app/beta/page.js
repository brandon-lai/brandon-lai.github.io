import {
  Caveat,
  Cinzel,
  Silkscreen,
  Space_Grotesk,
  Special_Elite,
  VT323,
} from "next/font/google";
import Lab from "./Lab";
import "./lab.css";

const cinzel = Cinzel({ subsets: ["latin"], weight: ["600"], variable: "--font-stone" });
const caveat = Caveat({ subsets: ["latin"], weight: ["500"], variable: "--font-hand" });
const elite = Special_Elite({ subsets: ["latin"], weight: "400", variable: "--font-type" });
const silkscreen = Silkscreen({ subsets: ["latin"], weight: "400", variable: "--font-pixel" });
const grotesk = Space_Grotesk({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-future" });
const vt = VT323({ subsets: ["latin"], weight: "400", variable: "--font-crt" });

const fontVars = [cinzel, caveat, elite, silkscreen, grotesk, vt]
  .map((f) => f.variable)
  .join(" ");

export const metadata = { title: "Beta — Brandon Lai" };

export default function Experimental() {
  return (
    <div className={`page page-lab ${fontVars}`}>
      <h1 className="lab-title">
        Beta<span className="star">*</span>
      </h1>

      <Lab />
    </div>
  );
}
