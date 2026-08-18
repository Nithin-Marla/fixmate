import React from 'react'
import {
  Wrench, PlugZap, Droplets, Snowflake, Hammer, Sparkles, Car, Paintbrush,
  ShieldCheck, WashingMachine, Sofa, Bug, Scissors, Wifi, Gamepad2,
  Stethoscope, GraduationCap, Briefcase, PawPrint, Flower2, ChefHat, Truck, HelpCircle
} from 'lucide-react'

const CATEGORY_ICONS = {
  mechanic: Wrench,
  electrical: PlugZap,
  plumbing: Droplets,
  'ac repair': Snowflake,
  'ac & hvac': Snowflake,
  'ac & refrigerator': Snowflake,
  carpentry: Hammer,
  cleaning: Sparkles,
  'painting & decor': Paintbrush,
  painting: Paintbrush,
  'car care': Car,
  'car service': Car,
  'home appliances': WashingMachine,
  'appliance repair': WashingMachine,
  'furniture assembly': Sofa,
  pest: Bug,
  'pest control': Bug,
  'beauty & salon': Scissors,
  'internet & wifi': Wifi,
  'electronics & gadgets': Gamepad2,
  'healthcare & wellness': Stethoscope,
  'tutoring & classes': GraduationCap,
  'packers & movers': Truck,
  'home security': ShieldCheck,
  'pet care': PawPrint,
  'gardening & landscaping': Flower2,
  'cooking & catering': ChefHat,
  'event & party': Briefcase
};

/**
 * Maps a service category name to a lucide icon.
 * categoryName: "Plumbing", "MECHANIC", "AC Repair", ...
 */
export default function ServiceIcon({ categoryName = '', size = 22, ...rest }) {
  const key = String(categoryName || '').toLowerCase().trim();
  const Icon = CATEGORY_ICONS[key] || (key.startsWith('ac') ? Snowflake : HelpCircle);
  return <Icon size={size} {...rest} />;
}
