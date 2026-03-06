// South African market vehicle makes and common models
// Used by AddVehicleDialog for searchable dropdowns

export interface VehicleMakeModels {
  make: string;
  models: string[];
}

export const VEHICLE_DATA: VehicleMakeModels[] = [
  { make: 'Alfa Romeo', models: ['Giulia', 'Stelvio', 'Giulietta', 'Tonale', '4C'] },
  { make: 'Aston Martin', models: ['DB11', 'DBX', 'Vantage', 'DBS Superleggera'] },
  { make: 'Audi', models: ['A1', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'Q2', 'Q3', 'Q5', 'Q7', 'Q8', 'RS3', 'RS4', 'RS5', 'RS6', 'RS7', 'RSQ8', 'S3', 'S4', 'S5', 'TT', 'R8', 'e-tron', 'e-tron GT'] },
  { make: 'Bentley', models: ['Continental GT', 'Flying Spur', 'Bentayga'] },
  { make: 'BMW', models: ['1 Series', '2 Series', '3 Series', '4 Series', '5 Series', '6 Series', '7 Series', '8 Series', 'X1', 'X2', 'X3', 'X4', 'X5', 'X6', 'X7', 'Z4', 'M2', 'M3', 'M4', 'M5', 'M8', 'iX', 'i4', 'i7', 'XM'] },
  { make: 'Chery', models: ['Tiggo 4 Pro', 'Tiggo 7 Pro', 'Tiggo 8 Pro', 'Tiggo 8 Pro Max'] },
  { make: 'Chevrolet', models: ['Spark', 'Aveo', 'Cruze', 'Trailblazer', 'Captiva'] },
  { make: 'Citroen', models: ['C3', 'C3 Aircross', 'C4', 'C5 Aircross'] },
  { make: 'Datsun', models: ['Go', 'Go+'] },
  { make: 'Ferrari', models: ['296 GTB', '296 GTS', 'F8 Tributo', 'SF90 Stradale', 'Roma', '812 Superfast', 'Purosangue'] },
  { make: 'Fiat', models: ['500', 'Tipo', 'Panda', 'Doblo'] },
  { make: 'Ford', models: ['Fiesta', 'Focus', 'EcoSport', 'Puma', 'Kuga', 'Everest', 'Ranger', 'Ranger Raptor', 'Mustang', 'Bronco', 'Territory'] },
  { make: 'GWM', models: ['P-Series', 'Steed', 'H6', 'Jolion', 'Tank 300', 'Tank 500', 'Ora'] },
  { make: 'Haval', models: ['Jolion', 'H6', 'H6 GT'] },
  { make: 'Honda', models: ['Fit', 'Jazz', 'Civic', 'Accord', 'HR-V', 'CR-V', 'BR-V', 'Ballade', 'Amaze', 'WR-V'] },
  { make: 'Hyundai', models: ['Grand i10', 'i20', 'i30', 'Elantra', 'Sonata', 'Venue', 'Creta', 'Tucson', 'Santa Fe', 'Palisade', 'Kona', 'Staria', 'Ioniq 5', 'Ioniq 6'] },
  { make: 'Infiniti', models: ['Q50', 'Q60', 'QX50', 'QX80'] },
  { make: 'Isuzu', models: ['D-Max', 'MU-X'] },
  { make: 'Jaguar', models: ['XE', 'XF', 'F-Type', 'E-Pace', 'F-Pace', 'I-Pace'] },
  { make: 'Jeep', models: ['Renegade', 'Compass', 'Cherokee', 'Grand Cherokee', 'Wrangler', 'Gladiator'] },
  { make: 'Kia', models: ['Picanto', 'Rio', 'Cerato', 'K5', 'Sonet', 'Seltos', 'Sportage', 'Sorento', 'Carnival', 'EV6', 'EV9', 'Stinger'] },
  { make: 'Lamborghini', models: ['Huracan', 'Urus', 'Revuelto'] },
  { make: 'Land Rover', models: ['Defender', 'Discovery', 'Discovery Sport', 'Range Rover', 'Range Rover Sport', 'Range Rover Velar', 'Range Rover Evoque'] },
  { make: 'Lexus', models: ['IS', 'ES', 'LS', 'NX', 'RX', 'UX', 'LX', 'LC', 'RC'] },
  { make: 'Mahindra', models: ['KUV100', 'XUV300', 'XUV400', 'XUV700', 'Scorpio', 'Pik Up', 'Bolero'] },
  { make: 'Maserati', models: ['Ghibli', 'Quattroporte', 'Levante', 'MC20', 'Grecale'] },
  { make: 'Mazda', models: ['Mazda2', 'Mazda3', 'Mazda6', 'CX-3', 'CX-30', 'CX-5', 'CX-60', 'MX-5', 'BT-50'] },
  { make: 'McLaren', models: ['720S', '765LT', 'Artura', 'GT'] },
  { make: 'Mercedes-Benz', models: ['A-Class', 'B-Class', 'C-Class', 'E-Class', 'S-Class', 'CLA', 'CLS', 'GLA', 'GLB', 'GLC', 'GLE', 'GLS', 'G-Class', 'AMG GT', 'EQA', 'EQB', 'EQC', 'EQE', 'EQS', 'V-Class', 'X-Class', 'Maybach'] },
  { make: 'MINI', models: ['Hatch', 'Cooper', 'Cooper S', 'JCW', 'Clubman', 'Countryman', 'Convertible'] },
  { make: 'Mitsubishi', models: ['Mirage', 'ASX', 'Eclipse Cross', 'Outlander', 'Pajero', 'Pajero Sport', 'Triton'] },
  { make: 'Nissan', models: ['Micra', 'Almera', 'Qashqai', 'X-Trail', 'Pathfinder', 'Patrol', 'Navara', 'NP200', 'NP300', 'Magnite', 'Leaf', 'GT-R', '370Z'] },
  { make: 'Opel', models: ['Corsa', 'Astra', 'Crossland', 'Grandland', 'Mokka'] },
  { make: 'Peugeot', models: ['208', '2008', '308', '3008', '408', '5008'] },
  { make: 'Porsche', models: ['911', '718 Cayman', '718 Boxster', 'Cayenne', 'Macan', 'Panamera', 'Taycan'] },
  { make: 'Renault', models: ['Kwid', 'Clio', 'Megane', 'Duster', 'Koleos', 'Captur', 'Triber', 'Kiger'] },
  { make: 'Rolls-Royce', models: ['Ghost', 'Phantom', 'Wraith', 'Dawn', 'Cullinan', 'Spectre'] },
  { make: 'Suzuki', models: ['S-Presso', 'Celerio', 'Swift', 'Baleno', 'Ignis', 'Vitara Brezza', 'Grand Vitara', 'Jimny', 'Fronx', 'Ertiga', 'XL6'] },
  { make: 'Tesla', models: ['Model 3', 'Model Y', 'Model S', 'Model X'] },
  { make: 'Toyota', models: ['Agya', 'Starlet', 'Corolla', 'Corolla Cross', 'Camry', 'Yaris', 'Yaris Cross', 'C-HR', 'RAV4', 'Fortuner', 'Land Cruiser', 'Land Cruiser 300', 'Prado', 'Hilux', 'Urban Cruiser', 'Vitz', 'Rush', 'GR86', 'GR Supra', 'bZ4X', 'Veloz', 'Rumion'] },
  { make: 'Volkswagen', models: ['Polo', 'Polo Vivo', 'Golf', 'Golf GTI', 'Golf R', 'Jetta', 'Passat', 'Arteon', 'T-Cross', 'T-Roc', 'Tiguan', 'Touareg', 'ID.4', 'Amarok', 'Caddy', 'Transporter', 'Caravelle'] },
  { make: 'Volvo', models: ['S60', 'S90', 'V40', 'V60', 'XC40', 'XC60', 'XC90', 'C40 Recharge'] },
];

// Flat list of all makes for the dropdown
export const VEHICLE_MAKES = VEHICLE_DATA.map(v => v.make);

// Get models for a given make
export const getModelsForMake = (make: string): string[] => {
  const found = VEHICLE_DATA.find(v => v.make.toLowerCase() === make.toLowerCase());
  return found?.models || [];
};

// Common years (current year down to 1990)
export const VEHICLE_YEARS = Array.from(
  { length: new Date().getFullYear() - 1989 },
  (_, i) => String(new Date().getFullYear() + 1 - i)
);

// Common colours for SA market
export const VEHICLE_COLOURS = [
  'Black', 'White', 'Silver', 'Grey', 'Blue', 'Red', 'Green',
  'Brown', 'Beige', 'Gold', 'Orange', 'Yellow', 'Purple',
  'Burgundy', 'Navy', 'Charcoal', 'Champagne', 'Bronze',
  'Pearl White', 'Metallic Grey', 'Midnight Blue', 'Racing Green',
];
