/**
 * Bangladesh administrative location hierarchy — Division -> District ->
 * Upazila/Thana.
 *
 * Base data (8 divisions, 64 districts, 494 rural upazilas) sourced from
 * nuhil/bangladesh-geocode (https://github.com/nuhil/bangladesh-geocode,
 * MIT licensed), a widely used, referentially-verified dataset (matches
 * the official division/district counts). Division/district/upazila names
 * use that source's English spellings (e.g. "Barisal"/"Chattagram" rather
 * than the newer official "Barishal"/"Chattogram" transliterations) for
 * internal consistency across the whole hierarchy.
 *
 * Dhaka district's entry additionally includes the 50 Dhaka
 * Metropolitan Police (DMP) thanas — a rural-upazila dataset alone omits
 * these, since they're police-jurisdiction jurisdictions of Dhaka City
 * Corporation, not upazilas. Cross-referenced against the main "Dhaka
 * Metropolitan Police" Wikipedia article (presented there as the complete
 * current list of 50 stations), the Wikipedia "Category:Thanas of Dhaka"
 * article list, and a government-document-derived summary of the
 * police.gov.bd DMP DC HQ announcement PDF. Kept as their real official
 * designations (including "Model"/"Industrial Area" suffixes and the
 * Uttara East/West split) rather than shortened informally.
 *
 * Do not hand-edit individual names without checking the source data.
 * Never invent or silently "complete" an entry that isn't verified.
 */

export interface BangladeshDistrict {
  name: string;
  upazilas: string[];
}

export interface BangladeshDivision {
  name: string;
  districts: BangladeshDistrict[];
}

export const bangladeshLocations: BangladeshDivision[] = [
  {
    "name": "Barisal",
    "districts": [
      {
        "name": "Barguna",
        "upazilas": [
          "Amtali",
          "Bamna",
          "Barguna Sadar",
          "Betagi",
          "Pathorghata",
          "Taltali"
        ]
      },
      {
        "name": "Barisal",
        "upazilas": [
          "Agailjhara",
          "Babuganj",
          "Bakerganj",
          "Banaripara",
          "Barisal Sadar",
          "Gournadi",
          "Hizla",
          "Mehendiganj",
          "Muladi",
          "Wazirpur"
        ]
      },
      {
        "name": "Bhola",
        "upazilas": [
          "Bhola Sadar",
          "Borhan Sddin",
          "Charfesson",
          "Doulatkhan",
          "Lalmohan",
          "Monpura",
          "Tazumuddin"
        ]
      },
      {
        "name": "Jhalakathi",
        "upazilas": [
          "Jhalakathi Sadar",
          "Kathalia",
          "Nalchity",
          "Rajapur"
        ]
      },
      {
        "name": "Patuakhali",
        "upazilas": [
          "Bauphal",
          "Dashmina",
          "Dumki",
          "Galachipa",
          "Kalapara",
          "Mirzaganj",
          "Patuakhali Sadar",
          "Rangabali"
        ]
      },
      {
        "name": "Pirojpur",
        "upazilas": [
          "Bhandaria",
          "Kawkhali",
          "Mathbaria",
          "Nazirpur",
          "Nesarabad",
          "Pirojpur Sadar",
          "Zianagar"
        ]
      }
    ]
  },
  {
    "name": "Chattagram",
    "districts": [
      {
        "name": "Bandarban",
        "upazilas": [
          "Alikadam",
          "Bandarban Sadar",
          "Lama",
          "Naikhongchhari",
          "Rowangchhari",
          "Ruma",
          "Thanchi"
        ]
      },
      {
        "name": "Brahmanbaria",
        "upazilas": [
          "Akhaura",
          "Ashuganj",
          "Bancharampur",
          "Bijoynagar",
          "Brahmanbaria Sadar",
          "Kasba",
          "Nabinagar",
          "Nasirnagar",
          "Sarail"
        ]
      },
      {
        "name": "Chandpur",
        "upazilas": [
          "Chandpur Sadar",
          "Faridgonj",
          "Haimchar",
          "Hajiganj",
          "Kachua",
          "Matlab North",
          "Matlab South",
          "Shahrasti"
        ]
      },
      {
        "name": "Chattogram",
        "upazilas": [
          "Anwara",
          "Banshkhali",
          "Boalkhali",
          "Chandanaish",
          "Fatikchhari",
          "Hathazari",
          "Karnafuli",
          "Lohagara",
          "Mirsharai",
          "Patiya",
          "Rangunia",
          "Raozan",
          "Sandwip",
          "Satkania",
          "Sitakunda"
        ]
      },
      {
        "name": "Comilla",
        "upazilas": [
          "Barura",
          "Brahmanpara",
          "Burichang",
          "Chandina",
          "Chauddagram",
          "Comilla Sadar",
          "Daudkandi",
          "Debidwar",
          "Homna",
          "Laksam",
          "Lalmai",
          "Meghna",
          "Monohargonj",
          "Muradnagar",
          "Nangalkot",
          "Sadarsouth",
          "Titas"
        ]
      },
      {
        "name": "Coxsbazar",
        "upazilas": [
          "Chakaria",
          "Coxsbazar Sadar",
          "Eidgaon",
          "Kutubdia",
          "Moheshkhali",
          "Pekua",
          "Ramu",
          "Teknaf",
          "Ukhiya"
        ]
      },
      {
        "name": "Feni",
        "upazilas": [
          "Chhagalnaiya",
          "Daganbhuiyan",
          "Feni Sadar",
          "Fulgazi",
          "Parshuram",
          "Sonagazi"
        ]
      },
      {
        "name": "Khagrachhari",
        "upazilas": [
          "Dighinala",
          "Guimara",
          "Khagrachhari Sadar",
          "Laxmichhari",
          "Manikchari",
          "Matiranga",
          "Mohalchari",
          "Panchari",
          "Ramgarh"
        ]
      },
      {
        "name": "Lakshmipur",
        "upazilas": [
          "Kamalnagar",
          "Lakshmipur Sadar",
          "Raipur",
          "Ramganj",
          "Ramgati"
        ]
      },
      {
        "name": "Noakhali",
        "upazilas": [
          "Begumganj",
          "Chatkhil",
          "Companiganj",
          "Hatia",
          "Kabirhat",
          "Noakhali Sadar",
          "Senbug",
          "Sonaimori",
          "Subarnachar"
        ]
      },
      {
        "name": "Rangamati",
        "upazilas": [
          "Baghaichari",
          "Barkal",
          "Belaichari",
          "Juraichari",
          "Kaptai",
          "Kawkhali",
          "Langadu",
          "Naniarchar",
          "Rajasthali",
          "Rangamati Sadar"
        ]
      }
    ]
  },
  {
    "name": "Dhaka",
    "districts": [
      {
        "name": "Dhaka",
        "upazilas": [
          "Adabor",
          "Airport",
          "Badda",
          "Banani",
          "Bangshal",
          "Bhashantek",
          "Cantonment",
          "Chackbazar",
          "Dakshin Khan",
          "Darus-Salam",
          "Demra",
          "Dhamrai",
          "Dhanmondi",
          "Dohar",
          "Gandaria",
          "Gulshan",
          "Hatirjheel",
          "Hazaribagh",
          "Jatrabari",
          "Kadamtoli",
          "Kafrul",
          "Kalabagan",
          "Kamrangirchar",
          "Keraniganj",
          "Khilgaon",
          "Khilkhet",
          "Kotwali",
          "Lalbagh",
          "Mirpur Model",
          "Mohammadpur",
          "Motijheel",
          "Mugda",
          "Nawabganj",
          "New Market",
          "Pallabi",
          "Paltan Model",
          "Ramna Model",
          "Rampura",
          "Rupnagar",
          "Sabujbag",
          "Savar",
          "Shah Ali",
          "Shahbag",
          "Shahjahanpur",
          "Sher-e-Bangla Nagar",
          "Shyampur",
          "Sutrapur",
          "Tejgaon",
          "Tejgaon Industrial Area",
          "Turag",
          "Uttar Khan",
          "Uttara East",
          "Uttara West",
          "Vatara",
          "Wari"
        ]
      },
      {
        "name": "Faridpur",
        "upazilas": [
          "Alfadanga",
          "Bhanga",
          "Boalmari",
          "Charbhadrasan",
          "Faridpur Sadar",
          "Madhukhali",
          "Nagarkanda",
          "Sadarpur",
          "Saltha"
        ]
      },
      {
        "name": "Gazipur",
        "upazilas": [
          "Gazipur Sadar",
          "Kaliakair",
          "Kaliganj",
          "Kapasia",
          "Sreepur"
        ]
      },
      {
        "name": "Gopalganj",
        "upazilas": [
          "Gopalganj Sadar",
          "Kashiani",
          "Kotalipara",
          "Muksudpur",
          "Tungipara"
        ]
      },
      {
        "name": "Kishoreganj",
        "upazilas": [
          "Austagram",
          "Bajitpur",
          "Bhairab",
          "Hossainpur",
          "Itna",
          "Karimgonj",
          "Katiadi",
          "Kishoreganj Sadar",
          "Kuliarchar",
          "Mithamoin",
          "Nikli",
          "Pakundia",
          "Tarail"
        ]
      },
      {
        "name": "Madaripur",
        "upazilas": [
          "Dasar",
          "Kalkini",
          "Madaripur Sadar",
          "Rajoir",
          "Shibchar"
        ]
      },
      {
        "name": "Manikganj",
        "upazilas": [
          "Doulatpur",
          "Gior",
          "Harirampur",
          "Manikganj Sadar",
          "Saturia",
          "Shibaloy",
          "Singiar"
        ]
      },
      {
        "name": "Munshiganj",
        "upazilas": [
          "Gajaria",
          "Louhajanj",
          "Munshiganj Sadar",
          "Sirajdikhan",
          "Sreenagar",
          "Tongibari"
        ]
      },
      {
        "name": "Narayanganj",
        "upazilas": [
          "Araihazar",
          "Bandar",
          "Narayanganj Sadar",
          "Rupganj",
          "Sonargaon"
        ]
      },
      {
        "name": "Narsingdi",
        "upazilas": [
          "Belabo",
          "Monohardi",
          "Narsingdi Sadar",
          "Palash",
          "Raipura",
          "Shibpur"
        ]
      },
      {
        "name": "Rajbari",
        "upazilas": [
          "Baliakandi",
          "Goalanda",
          "Kalukhali",
          "Pangsa",
          "Rajbari Sadar"
        ]
      },
      {
        "name": "Shariatpur",
        "upazilas": [
          "Bhedarganj",
          "Damudya",
          "Gosairhat",
          "Naria",
          "Shariatpur Sadar",
          "Zajira"
        ]
      },
      {
        "name": "Tangail",
        "upazilas": [
          "Basail",
          "Bhuapur",
          "Delduar",
          "Dhanbari",
          "Ghatail",
          "Gopalpur",
          "Kalihati",
          "Madhupur",
          "Mirzapur",
          "Nagarpur",
          "Sakhipur",
          "Tangail Sadar"
        ]
      }
    ]
  },
  {
    "name": "Khulna",
    "districts": [
      {
        "name": "Bagerhat",
        "upazilas": [
          "Bagerhat Sadar",
          "Chitalmari",
          "Fakirhat",
          "Kachua",
          "Mollahat",
          "Mongla",
          "Morrelganj",
          "Rampal",
          "Sarankhola"
        ]
      },
      {
        "name": "Chuadanga",
        "upazilas": [
          "Alamdanga",
          "Chuadanga Sadar",
          "Damurhuda",
          "Jibannagar"
        ]
      },
      {
        "name": "Jashore",
        "upazilas": [
          "Abhaynagar",
          "Bagherpara",
          "Chougachha",
          "Jessore Sadar",
          "Jhikargacha",
          "Keshabpur",
          "Manirampur",
          "Sharsha"
        ]
      },
      {
        "name": "Jhenaidah",
        "upazilas": [
          "Harinakundu",
          "Jhenaidah Sadar",
          "Kaliganj",
          "Kotchandpur",
          "Moheshpur",
          "Shailkupa"
        ]
      },
      {
        "name": "Khulna",
        "upazilas": [
          "Botiaghata",
          "Dakop",
          "Digholia",
          "Dumuria",
          "Fultola",
          "Koyra",
          "Paikgasa",
          "Rupsha",
          "Terokhada"
        ]
      },
      {
        "name": "Kushtia",
        "upazilas": [
          "Bheramara",
          "Daulatpur",
          "Khoksa",
          "Kumarkhali",
          "Kushtia Sadar",
          "Mirpur"
        ]
      },
      {
        "name": "Magura",
        "upazilas": [
          "Magura Sadar",
          "Mohammadpur",
          "Shalikha",
          "Sreepur"
        ]
      },
      {
        "name": "Meherpur",
        "upazilas": [
          "Gangni",
          "Meherpur Sadar",
          "Mujibnagar"
        ]
      },
      {
        "name": "Narail",
        "upazilas": [
          "Kalia",
          "Lohagara",
          "Narail Sadar"
        ]
      },
      {
        "name": "Satkhira",
        "upazilas": [
          "Assasuni",
          "Debhata",
          "Kalaroa",
          "Kaliganj",
          "Satkhira Sadar",
          "Shyamnagar",
          "Tala"
        ]
      }
    ]
  },
  {
    "name": "Mymensingh",
    "districts": [
      {
        "name": "Jamalpur",
        "upazilas": [
          "Bokshiganj",
          "Dewangonj",
          "Islampur",
          "Jamalpur Sadar",
          "Madarganj",
          "Melandah",
          "Sarishabari"
        ]
      },
      {
        "name": "Mymensingh",
        "upazilas": [
          "Bhaluka",
          "Dhobaura",
          "Fulbaria",
          "Gafargaon",
          "Gouripur",
          "Haluaghat",
          "Iswarganj",
          "Muktagacha",
          "Mymensingh Sadar",
          "Nandail",
          "Phulpur",
          "Tarakanda",
          "Trishal"
        ]
      },
      {
        "name": "Netrokona",
        "upazilas": [
          "Atpara",
          "Barhatta",
          "Durgapur",
          "Kalmakanda",
          "Kendua",
          "Khaliajuri",
          "Madan",
          "Mohongonj",
          "Netrokona Sadar",
          "Purbadhala"
        ]
      },
      {
        "name": "Sherpur",
        "upazilas": [
          "Jhenaigati",
          "Nalitabari",
          "Nokla",
          "Sherpur Sadar",
          "Sreebordi"
        ]
      }
    ]
  },
  {
    "name": "Rajshahi",
    "districts": [
      {
        "name": "Bogura",
        "upazilas": [
          "Adamdighi",
          "Bogra Sadar",
          "Dhunot",
          "Dupchanchia",
          "Gabtali",
          "Kahaloo",
          "Nondigram",
          "Shajahanpur",
          "Shariakandi",
          "Sherpur",
          "Shibganj",
          "Sonatala"
        ]
      },
      {
        "name": "Chapainawabganj",
        "upazilas": [
          "Bholahat",
          "Chapainawabganj Sadar",
          "Gomostapur",
          "Nachol",
          "Shibganj"
        ]
      },
      {
        "name": "Joypurhat",
        "upazilas": [
          "Akkelpur",
          "Joypurhat Sadar",
          "Kalai",
          "Khetlal",
          "Panchbibi"
        ]
      },
      {
        "name": "Naogaon",
        "upazilas": [
          "Atrai",
          "Badalgachi",
          "Dhamoirhat",
          "Manda",
          "Mohadevpur",
          "Naogaon Sadar",
          "Niamatpur",
          "Patnitala",
          "Porsha",
          "Raninagar",
          "Sapahar"
        ]
      },
      {
        "name": "Natore",
        "upazilas": [
          "Bagatipara",
          "Baraigram",
          "Gurudaspur",
          "Lalpur",
          "Naldanga",
          "Natore Sadar",
          "Singra"
        ]
      },
      {
        "name": "Pabna",
        "upazilas": [
          "Atghoria",
          "Bera",
          "Bhangura",
          "Chatmohar",
          "Faridpur",
          "Ishurdi",
          "Pabna Sadar",
          "Santhia",
          "Sujanagar"
        ]
      },
      {
        "name": "Rajshahi",
        "upazilas": [
          "Bagha",
          "Bagmara",
          "Charghat",
          "Durgapur",
          "Godagari",
          "Mohonpur",
          "Paba",
          "Puthia",
          "Tanore"
        ]
      },
      {
        "name": "Sirajganj",
        "upazilas": [
          "Belkuchi",
          "Chauhali",
          "Kamarkhand",
          "Kazipur",
          "Raigonj",
          "Shahjadpur",
          "Sirajganj Sadar",
          "Tarash",
          "Ullapara"
        ]
      }
    ]
  },
  {
    "name": "Rangpur",
    "districts": [
      {
        "name": "Dinajpur",
        "upazilas": [
          "Birampur",
          "Birganj",
          "Birol",
          "Bochaganj",
          "Chirirbandar",
          "Dinajpur Sadar",
          "Fulbari",
          "Ghoraghat",
          "Hakimpur",
          "Kaharol",
          "Khansama",
          "Nawabganj",
          "Parbatipur"
        ]
      },
      {
        "name": "Gaibandha",
        "upazilas": [
          "Gaibandha Sadar",
          "Gobindaganj",
          "Palashbari",
          "Phulchari",
          "Sadullapur",
          "Saghata",
          "Sundarganj"
        ]
      },
      {
        "name": "Kurigram",
        "upazilas": [
          "Bhurungamari",
          "Charrajibpur",
          "Chilmari",
          "Kurigram Sadar",
          "Nageshwari",
          "Phulbari",
          "Rajarhat",
          "Rowmari",
          "Ulipur"
        ]
      },
      {
        "name": "Lalmonirhat",
        "upazilas": [
          "Aditmari",
          "Hatibandha",
          "Kaliganj",
          "Lalmonirhat Sadar",
          "Patgram"
        ]
      },
      {
        "name": "Nilphamari",
        "upazilas": [
          "Dimla",
          "Domar",
          "Jaldhaka",
          "Kishorganj",
          "Nilphamari Sadar",
          "Syedpur"
        ]
      },
      {
        "name": "Panchagarh",
        "upazilas": [
          "Atwari",
          "Boda",
          "Debiganj",
          "Panchagarh Sadar",
          "Tetulia"
        ]
      },
      {
        "name": "Rangpur",
        "upazilas": [
          "Badargonj",
          "Gangachara",
          "Kaunia",
          "Mithapukur",
          "Pirgacha",
          "Pirgonj",
          "Rangpur Sadar",
          "Taragonj"
        ]
      },
      {
        "name": "Thakurgaon",
        "upazilas": [
          "Baliadangi",
          "Haripur",
          "Pirganj",
          "Ranisankail",
          "Thakurgaon Sadar"
        ]
      }
    ]
  },
  {
    "name": "Sylhet",
    "districts": [
      {
        "name": "Habiganj",
        "upazilas": [
          "Ajmiriganj",
          "Bahubal",
          "Baniachong",
          "Chunarughat",
          "Habiganj Sadar",
          "Lakhai",
          "Madhabpur",
          "Nabiganj"
        ]
      },
      {
        "name": "Moulvibazar",
        "upazilas": [
          "Barlekha",
          "Juri",
          "Kamolganj",
          "Kulaura",
          "Moulvibazar Sadar",
          "Rajnagar",
          "Sreemangal"
        ]
      },
      {
        "name": "Sunamganj",
        "upazilas": [
          "Bishwambarpur",
          "Chhatak",
          "Derai",
          "Dharmapasha",
          "Dowarabazar",
          "Jagannathpur",
          "Jamalganj",
          "Madhyanagar",
          "Shalla",
          "South Sunamganj",
          "Sunamganj Sadar",
          "Tahirpur"
        ]
      },
      {
        "name": "Sylhet",
        "upazilas": [
          "Balaganj",
          "Beanibazar",
          "Bishwanath",
          "Companiganj",
          "Dakshinsurma",
          "Fenchuganj",
          "Golapganj",
          "Gowainghat",
          "Jaintiapur",
          "Kanaighat",
          "Osmaninagar",
          "Sylhet Sadar",
          "Zakiganj"
        ]
      }
    ]
  }
];

export const bangladeshDivisionNames: string[] = bangladeshLocations.map((division) => division.name);

export function getDistrictsForDivision(divisionName: string): string[] {
  const division = bangladeshLocations.find((entry) => entry.name === divisionName);
  return division ? division.districts.map((district) => district.name) : [];
}

export function getUpazilasForDistrict(divisionName: string, districtName: string): string[] {
  const division = bangladeshLocations.find((entry) => entry.name === divisionName);
  const district = division?.districts.find((entry) => entry.name === districtName);
  return district ? district.upazilas : [];
}

export function isValidDivision(divisionName: string): boolean {
  return bangladeshLocations.some((entry) => entry.name === divisionName);
}

export function isValidDistrictForDivision(divisionName: string, districtName: string): boolean {
  return getDistrictsForDivision(divisionName).includes(districtName);
}

export function isValidUpazilaForDistrict(divisionName: string, districtName: string, upazilaName: string): boolean {
  return getUpazilasForDistrict(divisionName, districtName).includes(upazilaName);
}
