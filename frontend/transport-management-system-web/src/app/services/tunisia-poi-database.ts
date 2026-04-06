// Base de données locale des magasins et lieux importants en Tunisie
// À compléter au fil du temps

export interface LocalPOI {
  name: string;
  lat: number;
  lng: number;
  city: string;
  type: 'supermarket' | 'school' | 'hospital' | 'pharmacy' | 'other';
  address?: string;
}

// AZIZA - Tous les magasins en Tunisie (coordonnées approximatives réalistes)
const AZIZA_SHOPS: LocalPOI[] = [
  // Grand Tunis
  { name: 'Aziza La Marsa Centre', lat: 36.8790, lng: 10.3250, city: 'la marsa', type: 'supermarket', address: 'Avenue Habib Bourguiba, La Marsa' },
  { name: 'Aziza Carthage Salammbô', lat: 36.8525, lng: 10.3235, city: 'carthage', type: 'supermarket', address: 'Rue de la Plage, Salammbô, Carthage' },
  { name: 'Aziza Sidi Bou Saïd', lat: 36.8686, lng: 10.3412, city: 'sidi bou said', type: 'supermarket', address: 'Route de la Corniche, Sidi Bou Saïd' },
  { name: 'Aziza Gammarth', lat: 36.8930, lng: 10.3050, city: 'gammarth', type: 'supermarket', address: 'Route de la Corniche, Gammarth' },
  { name: 'Aziza Ariana Centre', lat: 36.8625, lng: 10.1955, city: 'ariana', type: 'supermarket', address: 'Avenue de la République, Ariana' },
  { name: 'Aziza Soukra', lat: 36.8560, lng: 10.1890, city: 'soukra', type: 'supermarket', address: 'Route de l\'Aéroport, La Soukra' },
  { name: 'Azika Raoued', lat: 36.8990, lng: 10.2020, city: 'raoued', type: 'supermarket', address: 'Route Nationale, Raoued' },
  { name: 'Aziza Manouba', lat: 36.8085, lng: 10.0985, city: 'manouba', type: 'supermarket', address: 'Avenue Habib Bourguiba, Manouba' },
  { name: 'Aziza Douar Hicher', lat: 36.8020, lng: 10.0860, city: 'douar hicher', type: 'supermarket', address: 'Cité El Amel, Douar Hicher' },
  { name: 'Aziza Oued Ellil', lat: 36.8310, lng: 10.1220, city: 'oued ellil', type: 'supermarket', address: 'Avenue Principale, Oued Ellil' },
  { name: 'Aziza Mornaguia', lat: 36.8580, lng: 10.1420, city: 'mornaguia', type: 'supermarket', address: 'Centre-ville, Mornaguia' },
  { name: 'Aziza Ben Arous', lat: 36.7475, lng: 10.2185, city: 'ben arous', type: 'supermarket', address: 'Avenue Habib Bourguiba, Ben Arous' },
  { name: 'Aziza Mourouj 1', lat: 36.7295, lng: 10.1855, city: 'mourouj', type: 'supermarket', address: 'El Mourouj 1, Rue Principale' },
  { name: 'Aziza Mourouj 4', lat: 36.7320, lng: 10.1880, city: 'mourouj', type: 'supermarket', address: 'El Mourouj 4, Avenue Centrale' },
  { name: 'Aziza Kabaria', lat: 36.7525, lng: 10.2375, city: 'kabaria', type: 'supermarket', address: 'Rue Principale, Kabaria' },
  { name: 'Aziza Ezzahra', lat: 36.7715, lng: 10.3065, city: 'ezzahra', type: 'supermarket', address: 'Avenue Habib Bourguiba, Ezzahra' },
  { name: 'Aziza Rades', lat: 36.7685, lng: 10.2705, city: 'rades', type: 'supermarket', address: 'Cité El Amel, Radès' },
  { name: 'Aziza Rades Méliane', lat: 36.7660, lng: 10.2820, city: 'rades', type: 'supermarket', address: 'Mégrine, Route de Tunis' },
  { name: 'Aziza Hammam Lif', lat: 36.7275, lng: 10.3425, city: 'hammam lif', type: 'supermarket', address: 'Avenue Habib Bourguiba, Hammam Lif' },
  { name: 'Aziza Boumhel', lat: 36.7380, lng: 10.2240, city: 'boumhel', type: 'supermarket', address: 'Centre-ville, Boumhel' },
  { name: 'Aziza Hammam Chott', lat: 36.7080, lng: 10.3180, city: 'hammam chott', type: 'supermarket', address: 'Rue Principale, Hammam Chott' },
  { name: 'Aziza Mornag', lat: 36.6760, lng: 10.2910, city: 'mornag', type: 'supermarket', address: 'Avenue Principale, Mornag' },
  
  // Nabeul / Cap Bon
  { name: 'Aziza Nabeul Centre', lat: 36.4565, lng: 10.7375, city: 'nabeul', type: 'supermarket', address: 'Avenue Habib Bourguiba, Nabeul' },
  { name: 'Aziza Nabeul Zriba', lat: 36.4520, lng: 10.7310, city: 'nabeul', type: 'supermarket', address: 'Rue Zriba, Nabeul' },
  { name: 'Aziza Hammamet Centre', lat: 36.4005, lng: 10.6175, city: 'hammamet', type: 'supermarket', address: 'Avenue de la République, Hammamet' },
  { name: 'Aziza Hammamet Yasmine', lat: 36.3780, lng: 10.5980, city: 'hammamet', type: 'supermarket', address: 'Yasmine Hammamet' },
  { name: 'Aziza Korba', lat: 36.5790, lng: 10.8580, city: 'korba', type: 'supermarket', address: 'Route de Tunis, Korba' },
  { name: 'Aziza Menzel Temime', lat: 36.6920, lng: 10.9840, city: 'menzel temime', type: 'supermarket', address: 'Avenue Principale, Menzel Temime' },
  { name: 'Aziza Grombalia', lat: 36.6020, lng: 10.4980, city: 'grombalia', type: 'supermarket', address: 'Route de Tunis, Grombalia' },
  { name: 'Aziza Soliman', lat: 36.7100, lng: 10.4750, city: 'soliman', type: 'supermarket', address: 'Avenue Principale, Soliman' },
  { name: 'Aziza Bou Argoub', lat: 36.6450, lng: 10.4680, city: 'bou argoub', type: 'supermarket', address: 'Centre-ville, Bou Argoub' },
  { name: 'Aziza Dar Chaabane', lat: 36.4800, lng: 10.7580, city: 'dar chaabane', type: 'supermarket', address: 'Route de Tunis, Dar Chaabane' },
  { name: 'Aziza Béni Khalled', lat: 36.6620, lng: 10.5620, city: 'beni khaled', type: 'supermarket', address: 'Centre-ville, Béni Khalled' },
  { name: 'Aziza Béni Khiar', lat: 36.4620, lng: 10.9250, city: 'beni khiar', type: 'supermarket', address: 'Route de la Plage, Béni Khiar' },
  { name: 'Aziza El Haouaria', lat: 36.8360, lng: 11.0220, city: 'el haouaria', type: 'supermarket', address: 'Centre-ville, El Haouaria' },
  
  // Bizerte
  { name: 'Aziza Bizerte Centre', lat: 37.2745, lng: 9.8745, city: 'bizerte', type: 'supermarket', address: 'Rue de la République, Bizerte' },
  { name: 'Aziza Bizerte Corniche', lat: 37.2810, lng: 9.8680, city: 'bizerte', type: 'supermarket', address: 'Avenue Habib Thameur, Bizerte' },
  { name: 'Aziza Mateur', lat: 37.0410, lng: 9.6650, city: 'mateur', type: 'supermarket', address: 'Route de Tunis, Mateur' },
  { name: 'Aziza Menzel Bourguiba', lat: 37.1540, lng: 9.7850, city: 'menzel bourguiba', type: 'supermarket', address: 'Avenue Habib Bourguiba, Menzel Bourguiba' },
  { name: 'Aziza Menzel Jemil', lat: 37.2460, lng: 9.9020, city: 'menzel jemil', type: 'supermarket', address: 'Route de Bizerte, Menzel Jemil' },
  { name: 'Aziza Ras Jebel', lat: 37.1630, lng: 10.0280, city: 'ras jebel', type: 'supermarket', address: 'Centre-ville, Ras Jebel' },
  { name: 'Aziza Ghar El Melh', lat: 37.1840, lng: 10.1760, city: 'ghar el melh', type: 'supermarket', address: 'Port de Pêche, Ghar El Melh' },
  { name: 'Aziza Sejnane', lat: 37.0540, lng: 9.2390, city: 'sejnane', type: 'supermarket', address: 'Centre-ville, Sejnane' },
  { name: 'Aziza Utique', lat: 37.0620, lng: 10.0720, city: 'utique', type: 'supermarket', address: 'Route de Bizerte, Utique' },
  { name: 'Aziza Tinja', lat: 37.1320, lng: 9.6280, city: 'tinja', type: 'supermarket', address: 'Centre-ville, Tinja' },
  
  // Sousse / Sahel
  { name: 'Aziza Sousse Centre', lat: 35.8295, lng: 10.6385, city: 'sousse', type: 'supermarket', address: 'Avenue Habib Bourguiba, Sousse' },
  { name: 'Aziza Sousse Kantaoui', lat: 35.8910, lng: 10.5960, city: 'sousse', type: 'supermarket', address: 'Port El Kantaoui, Sousse' },
  { name: 'Aziza Sousse Riadh', lat: 35.8150, lng: 10.6120, city: 'sousse', type: 'supermarket', address: 'Riadhl Andalous, Sousse' },
  { name: 'Aziza Sousse Msaken', lat: 35.7290, lng: 10.5800, city: 'msaken', type: 'supermarket', address: 'Route de Tunis, Msaken' },
  { name: 'Aziza Kalâa Kebira', lat: 35.7830, lng: 10.5270, city: 'kala kebira', type: 'supermarket', address: 'Centre-ville, Kalâa Kebira' },
  { name: 'Aziza Kalâa Seghira', lat: 35.8340, lng: 10.5570, city: 'kala seghira', type: 'supermarket', address: 'Route de Sousse, Kalâa Seghira' },
  { name: 'Aziza Bouficha', lat: 35.6760, lng: 10.4850, city: 'bouficha', type: 'supermarket', address: 'Centre-ville, Bouficha' },
  { name: 'Aziza Akouda', lat: 35.8670, lng: 10.5660, city: 'akouda', type: 'supermarket', address: 'Route de Kantaoui, Akouda' },
  { name: 'Aziza Hergla', lat: 35.9910, lng: 10.4930, city: 'hergla', type: 'supermarket', address: 'Médina, Hergla' },
  { name: 'Aziza Enfidha', lat: 35.6260, lng: 10.3730, city: 'enfidha', type: 'supermarket', address: 'Route de Tunis, Enfidha' },
  { name: 'Aziza Kondar', lat: 35.6700, lng: 10.7600, city: 'kondar', type: 'supermarket', address: 'Centre-ville, Kondar' },
  { name: 'Aziza Sidi Bou Ali', lat: 35.7850, lng: 10.4600, city: 'sidi bou ali', type: 'supermarket', address: 'Route de Sousse, Sidi Bou Ali' },
  
  // Monastir / Mahdia
  { name: 'Aziza Monastir Centre', lat: 35.7775, lng: 10.8265, city: 'monastir', type: 'supermarket', address: 'Avenue de l\'Indépendance, Monastir' },
  { name: 'Aziza Monastir Skanes', lat: 35.7960, lng: 10.8240, city: 'monastir', type: 'supermarket', address: 'Zone Touristique Skanes, Monastir' },
  { name: 'Aziza Moknine', lat: 35.6600, lng: 10.8980, city: 'moknine', type: 'supermarket', address: 'Route de Monastir, Moknine' },
  { name: 'Aziza Sayada', lat: 35.6770, lng: 10.9260, city: 'sayada', type: 'supermarket', address: 'Port de Pêche, Sayada' },
  { name: 'Aziza Lamta', lat: 35.6920, lng: 10.8920, city: 'lamta', type: 'supermarket', address: 'Route de Monastir, Lamta' },
  { name: 'Aziza Ksar Hellal', lat: 35.6350, lng: 10.8980, city: 'ksar hellal', type: 'supermarket', address: 'Avenue Habib Bourguiba, Ksar Hellal' },
  { name: 'Aziza Jemmal', lat: 35.6210, lng: 10.7580, city: 'jemmal', type: 'supermarket', address: 'Centre-ville, Jemmal' },
  { name: 'Aziza Bekalta', lat: 35.6120, lng: 11.0160, city: 'bekalta', type: 'supermarket', address: 'Route de Mahdia, Bekalta' },
  { name: 'Aziza Mahdia Centre', lat: 35.5045, lng: 11.0625, city: 'mahdia', type: 'supermarket', address: 'Avenue Habib Bourguiba, Mahdia' },
  { name: 'Aziza Mahdia Zone Touristique', lat: 35.4920, lng: 11.0550, city: 'mahdia', type: 'supermarket', address: 'Zone Touristique, Mahdia' },
  { name: 'Aziza El Jem', lat: 35.2960, lng: 10.7060, city: 'el jem', type: 'supermarket', address: 'Près de l\'Amphithéâtre, El Jem' },
  { name: 'Aziza Chebba', lat: 35.3900, lng: 11.1480, city: 'chebba', type: 'supermarket', address: 'Route de Mahdia, Chebba' },
  { name: 'Aziza Melloulèche', lat: 35.5390, lng: 10.8630, city: 'mellouleche', type: 'supermarket', address: 'Centre-ville, Melloulèche' },
  
  // Sfax
  { name: 'Aziza Sfax Centre', lat: 34.7405, lng: 10.7605, city: 'sfax', type: 'supermarket', address: 'Rue Habib Maazoun, Sfax' },
  { name: 'Aziza Sfax Route Tunis', lat: 34.7540, lng: 10.7520, city: 'sfax', type: 'supermarket', address: 'Route de Tunis, Sfax' },
  { name: 'Aziza Sfax Route Gabès', lat: 34.7280, lng: 10.7780, city: 'sfax', type: 'supermarket', address: 'Route de Gabès, Sfax' },
  { name: 'Aziza Sfax Thyna', lat: 34.7170, lng: 10.7900, city: 'sfax', type: 'supermarket', address: 'Route de Thyna, Sfax' },
  { name: 'Aziza Sfax Agareb', lat: 34.7450, lng: 10.4480, city: 'agareb', type: 'supermarket', address: 'Centre-ville, Agareb' },
  { name: 'Aziza Sfax El Hencha', lat: 34.8120, lng: 10.7580, city: 'el hencha', type: 'supermarket', address: 'Route de Sfax, El Hencha' },
  { name: 'Aziza Sfax Sakiet Ezzit', lat: 34.7970, lng: 10.7950, city: 'sakiet ezzit', type: 'supermarket', address: 'Cité El Amel, Sakiet Ezzit' },
  { name: 'Aziza Sfax Sakiet Eddaier', lat: 34.8180, lng: 10.7920, city: 'sakiet eddaier', type: 'supermarket', address: 'Route de Sakiet, Sakiet Eddaier' },
  { name: 'Aziza Sfax Jebeniana', lat: 34.9400, lng: 10.9140, city: 'jebeniana', type: 'supermarket', address: 'Route de Sfax, Jebeniana' },
  { name: 'Aziza Sfax Bir Ali', lat: 34.7540, lng: 10.1150, city: 'bir ali', type: 'supermarket', address: 'Route de Tunis, Bir Ali Ben Khalifa' },
  { name: 'Aziza Sfax El Amra', lat: 34.7390, lng: 10.5980, city: 'el amra', type: 'supermarket', address: 'Centre-ville, El Amra' },
  { name: 'Aziza Sfax Skhira', lat: 34.2980, lng: 10.0700, city: 'skhira', type: 'supermarket', address: 'Zone Industrielle, Skhira' },
  { name: 'Aziza Sfax Mahares', lat: 34.5490, lng: 10.5040, city: 'mahares', type: 'supermarket', address: 'Route de Sfax, Mahares' },
  { name: 'Aziza Sfax Graïba', lat: 34.6520, lng: 10.4270, city: 'graiba', type: 'supermarket', address: 'Centre-ville, Graïba' },
  { name: 'Aziza Sfax Menzel Chaker', lat: 34.7920, lng: 10.5180, city: 'menzel chaker', type: 'supermarket', address: 'Route de Sfax, Menzel Chaker' },
  
  // Gabes / Sud
  { name: 'Aziza Gabes Centre', lat: 33.8875, lng: 10.0985, city: 'gabes', type: 'supermarket', address: 'Avenue Habib Bourguiba, Gabès' },
  { name: 'Aziza Gabes Chenini', lat: 33.8730, lng: 10.0750, city: 'gabes', type: 'supermarket', address: 'Cité Chenini, Gabès' },
  { name: 'Aziza Gabes Nouvelle', lat: 33.8940, lng: 10.1130, city: 'gabes', type: 'supermarket', address: 'Gabès Nouvelle' },
  { name: 'Aziza Mareth', lat: 33.6390, lng: 10.2820, city: 'mareth', type: 'supermarket', address: 'Route de Gabès, Mareth' },
  { name: 'Aziza Matmata', lat: 33.5440, lng: 9.9650, city: 'matmata', type: 'supermarket', address: 'Centre-ville, Matmata' },
  { name: 'Aziza El Hamma', lat: 33.8910, lng: 9.7950, city: 'el hamma', type: 'supermarket', address: 'Avenue Principale, El Hamma' },
  { name: 'Aziza Metouia', lat: 33.8970, lng: 10.1330, city: 'metouia', type: 'supermarket', address: 'Route de Gabès, Metouia' },
  { name: 'Aziza Médenine Centre', lat: 33.3555, lng: 10.5055, city: 'medenine', type: 'supermarket', address: 'Avenue Habib Bourguiba, Médenine' },
  { name: 'Aziza Médenine Nord', lat: 33.3640, lng: 10.5020, city: 'medenine', type: 'supermarket', address: 'Cité El Amel, Médenine' },
  { name: 'Aziza Ben Guerdane', lat: 33.1330, lng: 10.5160, city: 'ben guerdane', type: 'supermarket', address: 'Route de la Frontière, Ben Guerdane' },
  { name: 'Aziza Zarzis', lat: 33.5030, lng: 11.1080, city: 'zarzis', type: 'supermarket', address: 'Avenue Habib Bourguiba, Zarzis' },
  { name: 'Aziza Houmt Souk Djerba', lat: 33.8760, lng: 10.8490, city: 'houmt souk', type: 'supermarket', address: 'Avenue Habib Bourguiba, Houmt Souk, Djerba' },
  { name: 'Aziza Midoun Djerba', lat: 33.8170, lng: 10.8840, city: 'midoun', type: 'supermarket', address: 'Route de Djerba, Midoun' },
  { name: 'Aziza Tataouine', lat: 32.9295, lng: 10.4515, city: 'tataouine', type: 'supermarket', address: 'Avenue de la République, Tataouine' },
  { name: 'Aziza Remada', lat: 32.6640, lng: 10.3580, city: 'remada', type: 'supermarket', address: 'Centre-ville, Remada' },
  { name: 'Aziza Ghomrassen', lat: 33.2310, lng: 10.4180, city: 'ghomrassen', type: 'supermarket', address: 'Route de Tataouine, Ghomrassen' },
  
  // Ouest / Centre-Ouest
  { name: 'Aziza Béja Centre', lat: 36.7265, lng: 9.1845, city: 'beja', type: 'supermarket', address: 'Avenue Habib Bourguiba, Béja' },
  { name: 'Aziza Béja Nord', lat: 36.7340, lng: 9.1890, city: 'beja', type: 'supermarket', address: 'Cité El Amel, Béja' },
  { name: 'Aziza Testour', lat: 36.5020, lng: 9.3630, city: 'testour', type: 'supermarket', address: 'Route de Béja, Testour' },
  { name: 'Aziza Goubellat', lat: 36.6020, lng: 9.4690, city: 'goubellat', type: 'supermarket', address: 'Centre-ville, Goubellat' },
  { name: 'Aziza Medjez El Bab', lat: 36.6530, lng: 9.7480, city: 'medjez el bab', type: 'supermarket', address: 'Route de Tunis, Medjez El Bab' },
  { name: 'Aziza Jendouba Centre', lat: 36.5065, lng: 8.7815, city: 'jendouba', type: 'supermarket', address: 'Avenue Habib Bourguiba, Jendouba' },
  { name: 'Aziza Jendouba Sud', lat: 36.4980, lng: 8.7750, city: 'jendouba', type: 'supermarket', address: 'Cité El Amel, Jendouba' },
  { name: 'Aziza Bou Salem', lat: 36.4250, lng: 8.6320, city: 'bou salem', type: 'supermarket', address: 'Centre-ville, Bou Salem' },
  { name: 'Aziza Tabarka', lat: 36.9540, lng: 8.7590, city: 'tabarka', type: 'supermarket', address: 'Avenue Habib Bourguiba, Tabarka' },
  { name: 'Aziza Aïn Draham', lat: 36.7690, lng: 8.7800, city: 'ain draham', type: 'supermarket', address: 'Route de Tabarka, Aïn Draham' },
  { name: 'Aziza Fernana', lat: 36.6680, lng: 8.5580, city: 'fernana', type: 'supermarket', address: 'Centre-ville, Fernana' },
  { name: 'Aziza Oued Meliz', lat: 36.5920, lng: 8.5520, city: 'oued meliz', type: 'supermarket', address: 'Route de Jendouba, Oued Meliz' },
  { name: 'Aziza El Kef Centre', lat: 36.1745, lng: 8.7055, city: 'kef', type: 'supermarket', address: 'Avenue Habib Bourguiba, Le Kef' },
  { name: 'Aziza Dahmani', lat: 35.8660, lng: 8.6660, city: 'dahmani', type: 'supermarket', address: 'Route du Kef, Dahmani' },
  { name: 'Aziza Tajerouine Centre', lat: 35.5140, lng: 8.6550, city: 'tajerouine', type: 'supermarket', address: 'Avenue Habib Bourguiba, Tajerouine' },
  { name: 'Aziza Tajerouine Nord', lat: 35.5160, lng: 8.6570, city: 'tajerouine', type: 'supermarket', address: 'Cité El Amel, Tajerouine' },
  { name: 'Aziza Siliana Centre', lat: 36.0855, lng: 9.3705, city: 'siliana', type: 'supermarket', address: 'Avenue Habib Bourguiba, Siliana' },
  { name: 'Aziza Makthar', lat: 35.8530, lng: 9.3240, city: 'makthar', type: 'supermarket', address: 'Près du Site Archéologique, Makthar' },
  { name: 'Aziza Gaâfour', lat: 36.0080, lng: 9.0570, city: 'gaafour', type: 'supermarket', address: 'Centre-ville, Gaâfour' },
  { name: 'Aziza Krib', lat: 36.1250, lng: 8.9530, city: 'krib', type: 'supermarket', address: 'Centre-ville, Krib' },
  { name: 'Aziza Kesra', lat: 35.7740, lng: 9.0150, city: 'kesra', type: 'supermarket', address: 'Village de Kesra' },
  { name: 'Aziza El Aroussa', lat: 36.2470, lng: 8.8830, city: 'el aroussa', type: 'supermarket', address: 'Centre-ville, El Aroussa' },
  
  // Kairouan / Centre
  { name: 'Aziza Kairouan Centre', lat: 35.6785, lng: 10.0965, city: 'kairouan', type: 'supermarket', address: 'Avenue de la République, Kairouan' },
  { name: 'Aziza Kairouan Médina', lat: 35.6780, lng: 10.1000, city: 'kairouan', type: 'supermarket', address: 'Près de la Grande Mosquée, Kairouan' },
  { name: 'Aziza Kairouan Nasrallah', lat: 35.6920, lng: 10.0780, city: 'kairouan', type: 'supermarket', address: 'Cité Ennasr, Kairouan' },
  { name: 'Aziza Haffouz', lat: 35.5400, lng: 9.4540, city: 'haffouz', type: 'supermarket', address: 'Route de Kairouan, Haffouz' },
  { name: 'Aziza Alaâ', lat: 35.5780, lng: 9.9910, city: 'alaa', type: 'supermarket', address: 'Centre-ville, Alaâ' },
  { name: 'Aziza Sbikha', lat: 35.9090, lng: 10.1430, city: 'sbikha', type: 'supermarket', address: 'Route de Kairouan, Sbikha' },
  { name: 'Aziza Oueslatia', lat: 35.8690, lng: 9.2740, city: 'oueslatia', type: 'supermarket', address: 'Centre-ville, Oueslatia' },
  { name: 'Aziza Kasserine Centre', lat: 35.1675, lng: 8.8365, city: 'kasserine', type: 'supermarket', address: 'Avenue de la République, Kasserine' },
  { name: 'Aziza Kasserine Thala', lat: 35.3530, lng: 8.4670, city: 'thala', type: 'supermarket', address: 'Route de Kasserine, Thala' },
  { name: 'Aziza Sbeitla', lat: 35.2330, lng: 9.1190, city: 'sbeitla', type: 'supermarket', address: 'Près du Temple Romain, Sbeitla' },
  { name: 'Aziza Sidi Bouzid Centre', lat: 35.0385, lng: 9.4855, city: 'sidi bouzid', type: 'supermarket', address: 'Avenue Habib Bourguiba, Sidi Bouzid' },
  { name: 'Aziza Regueb', lat: 35.1740, lng: 9.7620, city: 'regueb', type: 'supermarket', address: 'Route de Sidi Bouzid, Regueb' },
  { name: 'Aziza Meknassy', lat: 34.8900, lng: 9.5020, city: 'meknassy', type: 'supermarket', address: 'Centre-ville, Meknassy' },
  { name: 'Aziza Bir El Hafey', lat: 34.9500, lng: 9.1740, city: 'bir el hafey', type: 'supermarket', address: 'Route de Sidi Bouzid, Bir El Hafey' },
  { name: 'Aziza Cebbala Ouled Asker', lat: 35.2180, lng: 9.4070, city: 'cebballa', type: 'supermarket', address: 'Centre-ville, Cebbala Ouled Asker' },
  
  // Gafsa / Sud-Ouest
  { name: 'Aziza Gafsa Centre', lat: 34.4255, lng: 8.7845, city: 'gafsa', type: 'supermarket', address: 'Avenue Habib Bourguiba, Gafsa' },
  { name: 'Aziza Gafsa Cité Habib', lat: 34.4180, lng: 8.7920, city: 'gafsa', type: 'supermarket', address: 'Cité Habib, Gafsa' },
  { name: 'Aziza Métlaoui', lat: 34.3190, lng: 8.4010, city: 'metlaoui', type: 'supermarket', address: 'Route de Gafsa, Métlaoui' },
  { name: 'Aziza Moularès', lat: 34.3400, lng: 8.4330, city: 'moulares', type: 'supermarket', address: 'Centre-ville, Moularès' },
  { name: 'Aziza Redeyef', lat: 34.3820, lng: 8.1410, city: 'redeyef', type: 'supermarket', address: 'Route de Gafsa, Redeyef' },
  { name: 'Aziza Tozeur Centre', lat: 33.9195, lng: 8.1335, city: 'tozeur', type: 'supermarket', address: 'Avenue Habib Bourguiba, Tozeur' },
  { name: 'Aziza Nefta', lat: 33.8790, lng: 7.8830, city: 'nefta', type: 'supermarket', address: 'Route de Tozeur, Nefta' },
  { name: 'Aziza Degache', lat: 33.9670, lng: 8.1880, city: 'degache', type: 'supermarket', address: 'Centre-ville, Degache' },
  { name: 'Aziza Kebili', lat: 33.7040, lng: 8.9660, city: 'kebili', type: 'supermarket', address: 'Avenue Principale, Kébili' },
  { name: 'Aziza Douz', lat: 33.4600, lng: 9.0170, city: 'douz', type: 'supermarket', address: 'Porte du Sahara, Douz' },
  
  // Zaghouan
  { name: 'Aziza Zaghouan Centre', lat: 36.4035, lng: 10.1435, city: 'zaghouan', type: 'supermarket', address: 'Avenue Habib Bourguiba, Zaghouan' },
  { name: 'Aziza Zaghouan Temple Eaux', lat: 36.4080, lng: 10.1380, city: 'zaghouan', type: 'supermarket', address: 'Près du Temple des Eaux, Zaghouan' },
  { name: 'Aziza Bir Mchargua', lat: 36.5420, lng: 9.9800, city: 'bir mchargua', type: 'supermarket', address: 'Route de Zaghouan, Bir Mchargua' },
  { name: 'Aziza El Fahs', lat: 36.5690, lng: 9.8450, city: 'el fahs', type: 'supermarket', address: 'Centre-ville, El Fahs' },
  { name: 'Aziza Nadhour', lat: 36.1420, lng: 10.1680, city: 'nadhour', type: 'supermarket', address: 'Route de Zaghouan, Nadhour' },
  { name: 'Aziza Saouaf', lat: 36.1530, lng: 9.9650, city: 'saouaf', type: 'supermarket', address: 'Centre-ville, Saouaf' },
  { name: 'Aziza Zriba', lat: 36.4480, lng: 10.2260, city: 'zriba', type: 'supermarket', address: 'Village de Zriba' },
];

// MAGAZIN GENERAL - Principaux magasins
const MAGAZIN_GENERAL: LocalPOI[] = [
  { name: 'Magasin General La Marsa', lat: 36.8785, lng: 10.3245, city: 'la marsa', type: 'supermarket', address: 'Avenue Habib Bourguiba, La Marsa' },
  { name: 'Magasin General Tunis Centre', lat: 36.8065, lng: 10.1815, city: 'tunis', type: 'supermarket', address: 'Avenue Habib Bourguiba, Tunis' },
  { name: 'Magasin General Ariana', lat: 36.8620, lng: 10.1950, city: 'ariana', type: 'supermarket', address: 'Avenue de la République, Ariana' },
  { name: 'Magasin General Ben Arous', lat: 36.7470, lng: 10.2180, city: 'ben arous', type: 'supermarket', address: 'Avenue Habib Bourguiba, Ben Arous' },
  { name: 'Magasin General Manouba', lat: 36.8080, lng: 10.0980, city: 'manouba', type: 'supermarket', address: 'Centre-ville, Manouba' },
  { name: 'Magasin General Nabeul', lat: 36.4560, lng: 10.7370, city: 'nabeul', type: 'supermarket', address: 'Avenue Habib Bourguiba, Nabeul' },
  { name: 'Magasin General Sousse', lat: 35.8290, lng: 10.6380, city: 'sousse', type: 'supermarket', address: 'Avenue Habib Bourguiba, Sousse' },
  { name: 'Magasin General Sfax', lat: 34.7400, lng: 10.7600, city: 'sfax', type: 'supermarket', address: 'Route de Tunis, Sfax' },
  { name: 'Magasin General Bizerte', lat: 37.2740, lng: 9.8740, city: 'bizerte', type: 'supermarket', address: 'Rue de la République, Bizerte' },
  { name: 'Magasin General Kairouan', lat: 35.6780, lng: 10.0960, city: 'kairouan', type: 'supermarket', address: 'Avenue de la République, Kairouan' },
  { name: 'Magasin General Gabes', lat: 33.8870, lng: 10.0980, city: 'gabes', type: 'supermarket', address: 'Avenue Habib Bourguiba, Gabès' },
  { name: 'Magasin General Tajerouine', lat: 35.5140, lng: 8.6550, city: 'tajerouine', type: 'supermarket', address: 'Avenue Habib Bourguiba, Tajerouine' },
  { name: 'Magasin General Béja', lat: 36.7260, lng: 9.1840, city: 'beja', type: 'supermarket', address: 'Avenue Habib Bourguiba, Béja' },
  { name: 'Magasin General Jendouba', lat: 36.5060, lng: 8.7810, city: 'jendouba', type: 'supermarket', address: 'Avenue Habib Bourguiba, Jendouba' },
  { name: 'Magasin General Le Kef', lat: 36.1740, lng: 8.7050, city: 'kef', type: 'supermarket', address: 'Avenue Habib Bourguiba, Le Kef' },
  { name: 'Magasin General Siliana', lat: 36.0850, lng: 9.3700, city: 'siliana', type: 'supermarket', address: 'Avenue Habib Bourguiba, Siliana' },
  { name: 'Magasin General Kasserine', lat: 35.1670, lng: 8.8360, city: 'kasserine', type: 'supermarket', address: 'Avenue de la République, Kasserine' },
  { name: 'Magasin General Sidi Bouzid', lat: 35.0380, lng: 9.4850, city: 'sidi bouzid', type: 'supermarket', address: 'Avenue Habib Bourguiba, Sidi Bouzid' },
  { name: 'Magasin General Gafsa', lat: 34.4250, lng: 8.7840, city: 'gafsa', type: 'supermarket', address: 'Avenue Habib Bourguiba, Gafsa' },
  { name: 'Magasin General Tozeur', lat: 33.9190, lng: 8.1330, city: 'tozeur', type: 'supermarket', address: 'Avenue Habib Bourguiba, Tozeur' },
  { name: 'Magasin General Médenine', lat: 33.3550, lng: 10.5050, city: 'medenine', type: 'supermarket', address: 'Avenue Habib Bourguiba, Médenine' },
  { name: 'Magasin General Tataouine', lat: 32.9290, lng: 10.4510, city: 'tataouine', type: 'supermarket', address: 'Avenue de la République, Tataouine' },
  { name: 'Magasin General Zaghouan', lat: 36.4030, lng: 10.1430, city: 'zaghouan', type: 'supermarket', address: 'Avenue Habib Bourguiba, Zaghouan' },
  { name: 'Magasin General Monastir', lat: 35.7770, lng: 10.8260, city: 'monastir', type: 'supermarket', address: 'Avenue de l\'Indépendance, Monastir' },
  { name: 'Magasin General Mahdia', lat: 35.5040, lng: 11.0620, city: 'mahdia', type: 'supermarket', address: 'Avenue Habib Bourguiba, Mahdia' },
];

// CARREFOUR MARKET / MONOPRIX / GEANT
const SUPERMARKETS_CHAIN: LocalPOI[] = [
  // Carrefour Market
  { name: 'Carrefour Market La Marsa', lat: 36.8770, lng: 10.3230, city: 'la marsa', type: 'supermarket', address: 'Les Berges du Lac, La Marsa' },
  { name: 'Carrefour Market Lac 1', lat: 36.8380, lng: 10.2440, city: 'les berges du lac', type: 'supermarket', address: 'Les Berges du Lac 1, Tunis' },
  { name: 'Carrefour Market Lac 2', lat: 36.8440, lng: 10.2570, city: 'les berges du lac', type: 'supermarket', address: 'Les Berges du Lac 2, Tunis' },
  { name: 'Carrefour Market Ennasr', lat: 36.8470, lng: 10.1790, city: 'ennasr', type: 'supermarket', address: 'Cité Ennasr, Ariana' },
  { name: 'Carrefour Market Mutuelleville', lat: 36.8100, lng: 10.1780, city: 'tunis', type: 'supermarket', address: 'Mutuelleville, Tunis' },
  { name: 'Carrefour Market Menzah', lat: 36.8390, lng: 10.1640, city: 'menzah', type: 'supermarket', address: 'El Menzah 6, Tunis' },
  { name: 'Carrefour Market Sousse', lat: 35.8310, lng: 10.6400, city: 'sousse', type: 'supermarket', address: 'Avenue Habib Bourguiba, Sousse' },
  { name: 'Carrefour Market Sfax', lat: 34.7420, lng: 10.7620, city: 'sfax', type: 'supermarket', address: 'Route de Tunis, Sfax' },
  
  // Monoprix
  { name: 'Monoprix Tunis Lafayette', lat: 36.8050, lng: 10.1800, city: 'tunis', type: 'supermarket', address: 'Avenue de Paris, Tunis' },
  { name: 'Monoprix Tunis Habib Bourguiba', lat: 36.8030, lng: 10.1840, city: 'tunis', type: 'supermarket', address: 'Avenue Habib Bourguiba, Tunis' },
  { name: 'Monoprix La Marsa', lat: 36.8760, lng: 10.3220, city: 'la marsa', type: 'supermarket', address: 'Avenue Habib Bourguiba, La Marsa' },
  { name: 'Monoprix Sousse', lat: 35.8280, lng: 10.6370, city: 'sousse', type: 'supermarket', address: 'Avenue Habib Bourguiba, Sousse' },
  { name: 'Monoprix Sfax', lat: 34.7390, lng: 10.7590, city: 'sfax', type: 'supermarket', address: 'Rue Habib Maazoun, Sfax' },
  { name: 'Monoprix Nabeul', lat: 36.4550, lng: 10.7360, city: 'nabeul', type: 'supermarket', address: 'Avenue Habib Bourguiba, Nabeul' },
  { name: 'Monoprix Bizerte', lat: 37.2730, lng: 9.8730, city: 'bizerte', type: 'supermarket', address: 'Rue de la République, Bizerte' },
  
  // Géant
  { name: 'Géant La Marsa', lat: 36.8800, lng: 10.3260, city: 'la marsa', type: 'supermarket', address: 'Centre Commercial Géant, La Marsa' },
  { name: 'Géant Tunis City', lat: 36.8100, lng: 10.1850, city: 'tunis', type: 'supermarket', address: 'Rue de Marseille, Tunis' },
  { name: 'Géant Sousse', lat: 35.8320, lng: 10.6410, city: 'sousse', type: 'supermarket', address: 'Zone Commerciale, Sousse' },
  { name: 'Géant Sfax', lat: 34.7430, lng: 10.7630, city: 'sfax', type: 'supermarket', address: 'Zone Commerciale, Sfax' },
];

// Combiner tous les supermarchés
export const KNOWN_SUPERMARKETS: LocalPOI[] = [
  ...AZIZA_SHOPS,
  ...MAGAZIN_GENERAL,
  ...SUPERMARKETS_CHAIN,
];

// Écoles, lycées, collèges par ville
export const KNOWN_SCHOOLS: LocalPOI[] = [
  // Tajerouine
  { name: 'École Primaire Tajerouine', lat: 35.5145, lng: 8.6555, city: 'tajerouine', type: 'school', address: 'Rue de l\'École, Tajerouine' },
  { name: 'École Primaire Filles Tajerouine', lat: 35.5155, lng: 8.6560, city: 'tajerouine', type: 'school', address: 'Rue des Écoles, Tajerouine' },
  { name: 'Lycée Secondaire Tajerouine', lat: 35.5150, lng: 8.6565, city: 'tajerouine', type: 'school', address: 'Rue du Lycée, Tajerouine' },
  { name: 'Collège d\'Enseignement Secondaire Tajerouine', lat: 35.5135, lng: 8.6545, city: 'tajerouine', type: 'school', address: 'Cité Scolaire, Tajerouine' },
  
  // Grand Tunis
  { name: 'Lycée Pilote La Marsa', lat: 36.8750, lng: 10.3200, city: 'la marsa', type: 'school', address: 'Avenue Habib Bourguiba, La Marsa' },
  { name: 'Lycée Pilote Ariana', lat: 36.8600, lng: 10.1920, city: 'ariana', type: 'school', address: 'Cité El Amel, Ariana' },
  { name: 'Lycée Bourguiba Tunis', lat: 36.8010, lng: 10.1820, city: 'tunis', type: 'school', address: 'Avenue de Paris, Tunis' },
  { name: 'Lycée Pilote Sidi Bouzid', lat: 35.0370, lng: 9.4830, city: 'sidi bouzid', type: 'school', address: 'Cité Scolaire, Sidi Bouzid' },
  { name: 'École Internationale Carthage', lat: 36.8550, lng: 10.3250, city: 'carthage', type: 'school', address: 'Rue de la Plage, Carthage' },
  { name: 'Lycée Alaoui Tunis', lat: 36.8020, lng: 10.1790, city: 'tunis', type: 'school', address: 'Avenue de la Liberté, Tunis' },
];

// Hôpitaux et cliniques
export const KNOWN_HOSPITALS: LocalPOI[] = [
  // Tajerouine
  { name: 'Hôpital Régional Tajerouine', lat: 35.5155, lng: 8.6545, city: 'tajerouine', type: 'hospital', address: 'Rue de l\'Hôpital, Tajerouine' },
  { name: 'Centre de Santé de Base Tajerouine', lat: 35.5135, lng: 8.6540, city: 'tajerouine', type: 'hospital', address: 'Centre de Santé, Tajerouine' },
  
  // Grand Tunis
  { name: 'Hôpital Habib Thameur', lat: 36.8040, lng: 10.1850, city: 'tunis', type: 'hospital', address: 'Rue Ali Ben Ayed, Montfleury, Tunis' },
  { name: 'Hôpital La Rabta', lat: 36.8090, lng: 10.1720, city: 'tunis', type: 'hospital', address: 'Rue Jebel Lakhdhar, Tunis' },
  { name: 'Hôpital Charles Nicolle', lat: 36.8080, lng: 10.1710, city: 'tunis', type: 'hospital', address: 'Boulevard du 9 Avril, Tunis' },
  { name: 'Hôpital Mongi Slim La Marsa', lat: 36.8740, lng: 10.3190, city: 'la marsa', type: 'hospital', address: 'Rue de l\'Hôpital, La Marsa' },
  { name: 'Hôpital Militaire Tunis', lat: 36.8060, lng: 10.1760, city: 'tunis', type: 'hospital', address: 'Montfleury, Tunis' },
  { name: 'Institut Salah Azaiez', lat: 36.8095, lng: 10.1725, city: 'tunis', type: 'hospital', address: 'Boulevard du 9 Avril, Tunis' },
  { name: 'Hôpital Abderrahman Mami Ariana', lat: 36.8640, lng: 10.1960, city: 'ariana', type: 'hospital', address: 'Avenue de la République, Ariana' },
  { name: 'Hôpital Sahloul Sousse', lat: 35.8380, lng: 10.6120, city: 'sousse', type: 'hospital', address: 'Route de la Ceinture, Sahloul, Sousse' },
  { name: 'Hôpital Farhat Hached Sousse', lat: 35.8270, lng: 10.6360, city: 'sousse', type: 'hospital', address: 'Avenue Ibn El Jazzar, Sousse' },
  { name: 'Hôpital Hédi Chaker Sfax', lat: 34.7360, lng: 10.7640, city: 'sfax', type: 'hospital', address: 'Route El Ain Km 0.5, Sfax' },
  { name: 'Hôpital Habib Bourguiba Sfax', lat: 34.7410, lng: 10.7610, city: 'sfax', type: 'hospital', address: 'Avenue Majida Boulila, Sfax' },
];

// Pharmacies
export const KNOWN_PHARMACIES: LocalPOI[] = [
  // Tajerouine
  { name: 'Pharmacie Centrale Tajerouine', lat: 35.5142, lng: 8.6552, city: 'tajerouine', type: 'pharmacy', address: 'Rue Principale, Tajerouine' },
  { name: 'Pharmacie de Nuit Tajerouine', lat: 35.5138, lng: 8.6548, city: 'tajerouine', type: 'pharmacy', address: 'Avenue Habib Bourguiba, Tajerouine' },
  
  // Grand Tunis
  { name: 'Pharmacie Centrale Tunis', lat: 36.8025, lng: 10.1830, city: 'tunis', type: 'pharmacy', address: 'Avenue Habib Bourguiba, Tunis' },
  { name: 'Pharmacie La Marsa', lat: 36.8775, lng: 10.3240, city: 'la marsa', type: 'pharmacy', address: 'Avenue Habib Bourguiba, La Marsa' },
  { name: 'Pharmacie de Nuit Ariana', lat: 36.8615, lng: 10.1940, city: 'ariana', type: 'pharmacy', address: 'Avenue de la République, Ariana' },
];

// Fonction pour chercher dans la base locale
export function searchLocalPOI(query: string): LocalPOI[] {
  const queryLower = query.toLowerCase();
  const words = queryLower.split(/\s+/).filter(w => w.length > 2);
  
  // Extraire le nom de la ville (dernier mot)
  const cityName = words.length > 1 ? words[words.length - 1] : '';
  
  const allPOI = [
    ...KNOWN_SUPERMARKETS,
    ...KNOWN_SCHOOLS,
    ...KNOWN_HOSPITALS,
    ...KNOWN_PHARMACIES,
  ];
  
  // Filtrer par ville
  let cityPOI = allPOI.filter(poi => 
    cityName && poi.city.toLowerCase().includes(cityName)
  );
  
  // Si la requête contient un mot-clé spécifique, filtrer par type/nom
  if (queryLower.includes('aziza')) {
    cityPOI = cityPOI.filter(poi => poi.name.toLowerCase().includes('aziza'));
  } else if (queryLower.includes('magazin') || queryLower.includes('magasin')) {
    cityPOI = cityPOI.filter(poi => poi.name.toLowerCase().includes('magasin general'));
  } else if (queryLower.includes('carrefour')) {
    cityPOI = cityPOI.filter(poi => poi.name.toLowerCase().includes('carrefour'));
  } else if (queryLower.includes('monoprix')) {
    cityPOI = cityPOI.filter(poi => poi.name.toLowerCase().includes('monoprix'));
  } else if (queryLower.includes('géant') || queryLower.includes('geant')) {
    cityPOI = cityPOI.filter(poi => poi.name.toLowerCase().includes('géant') || poi.name.toLowerCase().includes('geant'));
  } else if (queryLower.includes('supermarché') || queryLower.includes('supermarket')) {
    cityPOI = cityPOI.filter(poi => poi.type === 'supermarket');
  } else if (queryLower.includes('école') || queryLower.includes('ecole') || queryLower.includes('lycée')) {
    cityPOI = cityPOI.filter(poi => poi.type === 'school');
  } else if (queryLower.includes('hôpital') || queryLower.includes('hopital') || queryLower.includes('clinique')) {
    cityPOI = cityPOI.filter(poi => poi.type === 'hospital');
  } else if (queryLower.includes('pharmacie')) {
    cityPOI = cityPOI.filter(poi => poi.type === 'pharmacy');
  }
  
  // Trier par pertinence
  return cityPOI.sort((a, b) => {
    // Les noms contenant exactement la requête en premier
    const aExact = a.name.toLowerCase().includes(queryLower) ? 0 : 1;
    const bExact = b.name.toLowerCase().includes(queryLower) ? 0 : 1;
    return aExact - bExact;
  });
}
