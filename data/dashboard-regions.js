window.AQUACROP_DASHBOARD_REGIONS = {
  France: ['Auvergne-Rhone-Alpes','Bourgogne-Franche-Comte','Bretagne','Centre-Val de Loire','Corse','Grand Est','Hauts-de-France','Ile-de-France','Normandie','Nouvelle-Aquitaine','Occitanie','Pays de la Loire','Provence-Alpes-Cote d Azur','Guadeloupe','Martinique','Guyane','La Reunion','Mayotte'],
  Italy: ['Abruzzo','Basilicata','Calabria','Campania','Emilia-Romagna','Friuli-Venezia Giulia','Lazio','Liguria','Lombardia','Marche','Molise','Piemonte','Puglia','Sardegna','Sicilia','Toscana','Trentino-Alto Adige','Umbria','Valle d Aosta','Veneto'],
  Portugal: ['Aveiro','Beja','Braga','Braganca','Castelo Branco','Coimbra','Evora','Faro','Guarda','Leiria','Lisboa','Portalegre','Porto','Santarem','Setubal','Viana do Castelo','Vila Real','Viseu','Azores','Madeira'],
  Spain: ['Andalucia','Aragon','Asturias','Balearic Islands','Canary Islands','Cantabria','Castile and Leon','Castilla-La Mancha','Catalonia','Valencian Community','Extremadura','Galicia','Community of Madrid','Region of Murcia','Navarre','Basque Country','La Rioja','Ceuta','Melilla'],
  Greece: ['East Macedonia and Thrace','Central Macedonia','Western Macedonia','Epirus','Thessaly','Ionian Islands','Western Greece','Central Greece','Attica','Peloponnese','North Aegean','South Aegean','Crete']
};

window.AQUACROP_REGION_OPTIONS = Object.entries(window.AQUACROP_DASHBOARD_REGIONS).flatMap(([country, regions]) => regions.map(region => ({ country, region, label: `${region}, ${country}` })));
