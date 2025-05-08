import Image from "next/image";
import styles from "./page.module.css";
import HeroSection from "@/components/HeroSection";
import FeaturesSection from "@/components/BottomHerosection";
import 'bootstrap/dist/css/bootstrap.min.css';
import 'animate.css';



export default function Home() {
  return (
    <div >
      <HeroSection/>
      <FeaturesSection/>
      
    </div>
  );
}
