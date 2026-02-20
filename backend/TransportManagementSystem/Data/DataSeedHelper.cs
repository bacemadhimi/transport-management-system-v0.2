using System;
using System.Linq;
using Microsoft.EntityFrameworkCore;
using TransportManagementSystem.Entity;
using TransportManagementSystem.Service;

namespace TransportManagementSystem.Data
{
    public class DataSeedHelper
    {
        private readonly PasswordHelper passwordHelper;

        private readonly ApplicationDbContext dbContext;

        public DataSeedHelper(ApplicationDbContext dbContext)
        {
            this.dbContext = dbContext;
            this.passwordHelper = new PasswordHelper();
        }


        public void InsertData()
        {
            try
            {
                // Appliquer les migrations
                dbContext.Database.Migrate();

                // Seed UserGroups (SuperAdmin, Admin)
                if (!dbContext.UserGroups.Any())
                {
                    dbContext.UserGroups.AddRange(
                        new UserGroup { Name = "SuperAdmin", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow , IsSystemGroup=true},
                        new UserGroup { Name = "Admin", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                        new UserGroup { Name = "Driver", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow } ,
                         new UserGroup { Name = "Lilas", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow }
                    );
                    dbContext.SaveChanges();
                    Console.WriteLine("UserGroups seedés !");
                }

                var superAdminGroup = dbContext.UserGroups.First(r => r.Name == "SuperAdmin");
                var adminGroup = dbContext.UserGroups.First(r => r.Name == "Admin");

                //  Seed Users
                if (!dbContext.Users.Any())
                {
                    var passwordHelper = new PasswordHelper();

                    var superAdminUser = new User
                    {
                        Email = "superAdmin@gmail.com",
                        Password = passwordHelper.HashPassword("12345"),
                    };
                    var adminUser = new User
                    {
                        Email = "admin@gmail.com",
                        Password = passwordHelper.HashPassword("12345")
                    };

                    dbContext.Users.AddRange(superAdminUser, adminUser);
                    dbContext.SaveChanges();

                    dbContext.UserGroup2Users.AddRange(
                        new UserGroup2User { UserId = superAdminUser.Id, UserGroupId = superAdminGroup.Id },
                        new UserGroup2User { UserId = adminUser.Id, UserGroupId = adminGroup.Id }
                    );
                    dbContext.SaveChanges();
                    Console.WriteLine("Utilisateurs assignés à leurs groupes !");
                }

                // Seed UserRights
                if (!dbContext.UserRights.Any())
                {
                    // Modules dans le même ordre que frontend
                    var modules = new[]
                    {
        "ACCUEIL",
        "CHAUFFEUR",
        "EMPLOYEE",
        "CONVOYEUR",
        "TRUCK",
        "ORDER",
        "TRAVEL",
        "HISTORIQUE_TRAVEL",
        "LOCATION",
        "USER",
        "USER_GROUP",
        "PERMISSION",
        "CUSTOMER",
        "FUEL_VENDOR",
        "FUEL",
        "MECHANIC",
        "VENDOR",
        "TRUCK_MAINTENANCE",
        "OVERTIME",
        "DRIVER_AVAILABILITY",
        "TRUCK_AVAILABILITY",
        "DAYOFF"
    };

                    // Définition des actions par module
                    var moduleActions = new Dictionary<string, string[]>
    {
        { "ACCUEIL", new[] { "VIEW" } },
        { "CHAUFFEUR", new[] { "VIEW","ADD","EDIT", "ENABLE","DISABLE", "PRINT", "APPROVED" } },
        { "EMPLOYEE", new[] { "VIEW","ADD","EDIT", "ENABLE","DISABLE", "PRINT", "APPROVED" } },
        { "CONVOYEUR", new[] { "VIEW","ADD","EDIT", "ENABLE", "DISABLE", "PRINT", "APPROVED" } },
        { "TRUCK", new[] { "VIEW","ADD","EDIT", "ENABLE","DISABLE", "PRINT", "APPROVED" } },
        { "ORDER", new[] { "VIEW","ADD","EDIT","DELETE","ENABLE","DISABLE", "PRINT", "LOAD" } },
        { "TRAVEL", new[] { "VIEW","ADD","EDIT", "ENABLE", "DISABLE", "PRINT", "APPROVED" } },
        { "HISTORIQUE_TRAVEL", new[] { "VIEW","ADD","EDIT", "ENABLE", "DISABLE", "PRINT" , "APPROVED" } },
        { "LOCATION", new[] { "VIEW","ADD","EDIT", "ENABLE", "DISABLE", "PRINT", "APPROVED" } },
        { "USER", new[] { "VIEW","ADD","EDIT", "ENABLE", "DISABLE", "PRINT", "APPROVED" } },
        { "USER_GROUP", new[] { "VIEW","ADD","EDIT", "ENABLE", "DISABLE", "PRINT", "APPROVED" } },
        { "PERMISSION", new[] { "VIEW","EDIT" } },
        { "CUSTOMER", new[] { "VIEW","ADD","EDIT", "ENABLE", "DISABLE","PRINT", "APPROVED" } },
        { "FUEL_VENDOR", new[] { "VIEW","ADD","EDIT", "ENABLE","DISABLE","PRINT", "APPROVED" } },
        { "FUEL", new[] { "VIEW","ADD","EDIT", "ENABLE", "DISABLE", "PRINT", "APPROVED" } },
        { "MECHANIC", new[] { "VIEW","ADD","EDIT", "ENABLE", "DISABLE", "PRINT", "APPROVED" } },
        { "VENDOR", new[] { "VIEW","ADD","EDIT","ENABLE", "DISABLE", "PRINT", "APPROVED" } },
        { "TRUCK_MAINTENANCE", new[] { "VIEW","ADD","EDIT","ENABLE", "DISABLE", "PRINT", "APPROVED" } },
        { "OVERTIME", new[] { "VIEW","ADD","EDIT","ENABLE", "DISABLE", "PRINT", "APPROVED" } },
        { "DRIVER_AVAILABILITY", new[] { "VIEW","ADD","EDIT","ENABLE", "DISABLE", "PRINT", "APPROVED" } },
        { "TRUCK_AVAILABILITY", new[] { "VIEW","ADD","EDIT","ENABLE", "DISABLE", "PRINT", "APPROVED" } },
        { "DAYOFF", new[] { "VIEW","ADD","EDIT","ENABLE", "DISABLE", "PRINT", "APPROVED" } },
    };

                    var rights = modules
                        .SelectMany(module => moduleActions[module].Select(action => new UserRight
                        {
                            Code = $"{module}_{action}",
                            Description = $"{action} {module}"
                        }))
                        .ToList();

                    // Droit système global
                    rights.Add(new UserRight
                    {
                        Code = "SYSTEM_MANAGEMENT",
                        Description = "Gestion système globale"
                    });

                    dbContext.UserRights.AddRange(rights);
                    dbContext.SaveChanges();

                    Console.WriteLine("UserRights (modules + actions) seedés !");
                }


                var allRights = dbContext.UserRights.ToList();

                // Assigner les droits par défaut
                // Assigner les droits par défaut selon le niveau
                void AssignRights(UserGroup group)
                {
                    Func<UserRight, bool> filter;

                    if (group.Name == "SuperAdmin" || group.Name == "Lilas")
                    {
                        filter = r => true; // Tous les droits
                    }

                    else if (group.Name == "Admin")
                    {
                        var excludedModules = new[]
                        {
            "CHAUFFEUR", "CONVOYEUR", "MECHANIC",
            "VENDOR", "VENDOR", "TRUCK_MAINTENANCE",
            "OVERTIME", "DRIVER_AVAILABILITY","TRUCK_AVAILABILITY","DAYOFF"
        };
                        filter = r => !excludedModules.Any(m => r.Code.StartsWith(m));
                    }
                   
                    else if (group.Name == "Driver")
                    {
                        filter = r => false;
                    }
                    else
                    {
                        filter = r => false; // Aucun droit par défaut
                    }

                    var rightsToAssign = allRights.Where(filter).ToList();
                    foreach (var right in rightsToAssign)
                    {
                        if (!dbContext.UserGroup2Rights.Any(ugr => ugr.UserGroupId == group.Id && ugr.UserRightId == right.Id))
                        {
                            dbContext.UserGroup2Rights.Add(new UserGroup2Right
                            {
                                UserGroupId = group.Id,
                                UserRightId = right.Id
                            });
                        }
                    }

                }




                // Appliquer aux groupes
                AssignRights(superAdminGroup);
                AssignRights(adminGroup);

                var levelGroups = dbContext.UserGroups.Where(g => g.Name.StartsWith("LEVEL")).ToList();
                foreach (var group in levelGroups)
                {
                    AssignRights(group);
                }

                dbContext.SaveChanges();
                Console.WriteLine("Droits assignés aux groupes selon la règle métier !");

            }
            catch (Exception ex)
            {
                Console.WriteLine($"Erreur lors du seeding : {ex.Message}");
                throw;
            }
            var tunisianZones = new List<string>
{"Tunis","Ariana","Ben Arous","Manouba","Bizerte","Nabeul","Zaghouan","Sousse","Monastir", "Mahdia", "Sfax", "Kairouan","Kasserine","Sidi Bouzid",
    "Gabès",
    "Médenine",
    "Tataouine",
    "Gafsa",
    "Tozeur",
    "Kébili",
    "Béja",
    "Jendouba",
    "Le Kef",
    "Siliana"
};

            //  Seed Zones (Tunisie)
            if (!dbContext.Zones.Any())
            {
                var now = DateTime.UtcNow;

                var zones = tunisianZones.Select(name => new Zone
                {
                    Name = name,
                    IsActive = true,
                    CreatedAt = now,
                    UpdatedAt = now
                }).ToList();

                dbContext.Zones.AddRange(zones);
                dbContext.SaveChanges();

                Console.WriteLine("Zones de Tunisie seedées avec succès !");
            }
            // Seed Governorates (Tunisia)
            if (!dbContext.GeneralSettings.Any(p => p.ParameterType == "GOVERNORATE"))
            {
                var now = DateTime.UtcNow;

                var tunisianGovernorates = new List<string>
    {
        "Tunis", "Ariana", "Ben Arous", "Manouba", "Bizerte", "Nabeul", "Zaghouan",
        "Sousse", "Monastir", "Mahdia", "Sfax", "Kairouan", "Kasserine", "Sidi Bouzid",
        "Gabès", "Médenine", "Tataouine", "Gafsa", "Tozeur", "Kébili", "Béja",
        "Jendouba", "Le Kef", "Siliana"
    };

                int codeIndex = 1; // You can create codes like GOV1, GOV2, ...

                var governorates = tunisianGovernorates.Select(name => new GeneralSettings
                {
                    ParameterType = "GOVERNORATE",
                    ParameterCode = $"GOV{codeIndex++}",
                    Description = name
                }).ToList();

                dbContext.GeneralSettings.AddRange(governorates);
                dbContext.SaveChanges();

                Console.WriteLine($"✔ {governorates.Count} Governorates seedés !");
            }
            if (!dbContext.Citys.Any())
            {
                var now = DateTime.UtcNow;

                var zoneCities = new Dictionary<string, List<string>>
    {
        { "Tunis", new List<string> { "Tunis", "Carthage", "La Marsa", "Le Bardo", "Sidi Bou Saïd", "El Menzah", "Bab Saadoun" } },
        { "Ariana", new List<string> { "Ariana Ville", "Raoued", "Kalaat el-Andalous", "La Soukra", "Mnihla", "Ettadhamen" } },
        { "Ben Arous", new List<string> { "Ben Arous", "Ezzahra", "Rades", "Mégrine", "Fouchana", "Hammam Chott", "Bou Mhel" } },
        { "Manouba", new List<string> { "Manouba", "Oued Ellil", "Douar Hicher", "Den Den", "Tebourba", "Mornaguia" } },
        { "Bizerte", new List<string> { "Bizerte", "Menzel Bourguiba", "Ras Jebel", "Ghar El Melh", "Mateur", "Sejnane" } },
        { "Nabeul", new List<string> { "Nabeul", "Hammamet", "Kelibia", "Korba", "Béni Khalled", "Takelsa", "El Haouaria" } },
        { "Zaghouan", new List<string> { "Zaghouan", "Bir Mcherga", "Nadhour", "El Fahs", "Zriba" } },
        { "Sousse", new List<string> { "Sousse", "Hergla", "Akouda", "Kondar", "Sousse Riadh", "Enfidha" } },
        { "Monastir", new List<string> { "Monastir", "Ksar Hellal", "Ouerdanine", "Bekalta", "Teboulba" } },
        { "Mahdia", new List<string> { "Mahdia", "Chorbane", "El Jem", "Ksour Essef", "Chebba" } },
        { "Sfax", new List<string> { "Sfax", "Sakiet Eddaier", "Agareb", "Thyna", "Kerkennah", "El Amra" } },
        { "Kairouan", new List<string> { "Kairouan", "Sbikha", "Chebika", "Oueslatia", "Haffouz" } },
        { "Kasserine", new List<string> { "Kasserine", "Foussana", "Thala", "Sbeitla", "Sbiba", "Majel Bel Abbès" } },
        { "Sidi Bouzid", new List<string> { "Sidi Bouzid", "Cebbala", "Meknassy", "Jilma", "Regueb" } },
        { "Gabès", new List<string> { "Gabès", "Ghannouch", "Mareth", "Matmata", "El Hamma" } },
        { "Médenine", new List<string> { "Médenine", "Beni Khedache", "Djerba", "Houmt Souk", "Ajim", "Midoun" } },
        { "Tataouine", new List<string> { "Tataouine", "Dhiba", "Bir Lahmar", "Ghomrassen", "Remada" } },
        { "Gafsa", new List<string> { "Gafsa", "El Ksar", "Redeyef", "Metlaoui", "Moularès" } },
        { "Tozeur", new List<string> { "Tozeur", "Degache", "Tamerza", "Nefta" } },
        { "Kébili", new List<string> { "Kébili", "Douz", "El Golaa", "Souk Lahad" } },
        { "Béja", new List<string> { "Béja", "Testour", "Nefza", "Goubellat" } },
        { "Jendouba", new List<string> { "Jendouba", "Fernana", "Aïn Draham", "Ghardimaou" } },
        { "Le Kef", new List<string> { "Le Kef", "El Ksour", "Nebeur", "Kalaat Khasba" } },
        { "Siliana", new List<string> { "Siliana", "Bargou", "Bou Arada", "Kesra" } },
    };

                var zones = dbContext.Zones.ToList();
                var cities = new List<City>();

                foreach (var kvp in zoneCities)
                {
                    var zoneName = kvp.Key;
                    var cityNames = kvp.Value;

                    var zone = zones.FirstOrDefault(z => z.Name == zoneName);
                    if (zone == null)
                    {
                        Console.WriteLine($"Zone {zoneName} non trouvée !");
                        continue;
                    }

                    cities.AddRange(cityNames.Select(cityName => new City
                    {
                        Name = cityName,
                        ZoneId = zone.Id,
                        IsActive = true,
                        CreatedAt = now,
                        UpdatedAt = now
                    }));
                }

                dbContext.Citys.AddRange(cities);
                dbContext.SaveChanges();

                Console.WriteLine("Toutes les villes de Tunisie seedées et associées à leurs zones !");
            }
            // Seed MANY Locations (Zone only)
            if (!dbContext.Locations.Any())
            {
                var now = DateTime.UtcNow;
                var zones = dbContext.Zones.ToList();

                var locations = new List<Location>();

                var locationNames = new[]
                {
        "Entrepôt",
        "Dépôt",
        "Plateforme",
        "Centre Logistique",
        "Hub"
    };

                int index = 1;

                foreach (var zone in zones)
                {
                    // 4 à 6 locations par zone
                    for (int i = 0; i < 5; i++)
                    {
                        locations.Add(new Location
                        {
                            Name = $"{locationNames[i % locationNames.Length]} {zone.Name} {index++}",
                            ZoneId = zone.Id,
                            IsActive = true,
                            CreatedAt = now,
                            UpdatedAt = now
                        });
                    }
                }

                dbContext.Locations.AddRange(locations);
                dbContext.SaveChanges();

                Console.WriteLine($"✔ {locations.Count} Locations seedées (par zone) !");
            }
            var driverGroup = dbContext.UserGroups.First(r => r.Name == "Driver");
            // Seed MANY Drivers + Users
            if (!dbContext.Drivers.Any())
            {
                var now = DateTime.UtcNow;
                var zones = dbContext.Zones.ToList();
                var cities = dbContext.Citys.ToList();
                var rnd = new Random();

                var drivers = new List<Driver>();
                var users = new List<User>();
                var userGroupLinks = new List<UserGroup2User>();

                var names = new[]
                {
        "Ahmed","Yassine","Sami","Mohamed","Ali","Hichem","Karim","Walid",
        "Nabil","Fathi","Aymen","Anis","Slim","Marwen","Bilel",
        "Oussama","Zied","Rami","Tarek","Lotfi"
    };

                int index = 1;

                foreach (var name in names)
                {
                    var zone = zones[rnd.Next(zones.Count)];
                    var city = cities.Where(c => c.ZoneId == zone.Id)
                                      .OrderBy(x => rnd.Next())
                                      .First();

                    var email = $"{name.ToLower()}{index}@tms.demo";

                    // DRIVER
                    var driver = new Driver
                    {
                        Name = $"{name} Driver {index}",
                        Email = email,
                        Phone = $"2{rnd.Next(1000000, 9999999)}",
                        phoneCountry = "+216",
                        PermisNumber = $"TN-{rnd.Next(10000, 99999)}",
                        Status = "Disponible",
                        IsEnable = true,
                        ZoneId = zone.Id,
                        CityId = city.Id,
                        UpdatedAt = now
                    };

                    drivers.Add(driver);

                    // USER
                    var user = new User
                    {
                        Email = email,
                        Password = passwordHelper.HashPassword("12345"),
                        Name = driver.Name,
                        Phone = driver.Phone,
                        phoneCountry = driver.phoneCountry
                    };

                    users.Add(user);

                    index++;
                }

                // Save Drivers + Users
                dbContext.Drivers.AddRange(drivers);
                dbContext.Users.AddRange(users);
                dbContext.SaveChanges();

                // Link Users to Driver Group
                foreach (var user in users)
                {
                    userGroupLinks.Add(new UserGroup2User
                    {
                        UserId = user.Id,
                        UserGroupId = driverGroup.Id
                    });
                }

                dbContext.UserGroup2Users.AddRange(userGroupLinks);
                dbContext.SaveChanges();

                Console.WriteLine($"✔ {drivers.Count} Drivers + Users Driver seedés !");
            }

            // 8Seed MANY Convoyeurs
            if (!dbContext.Convoyeurs.Any())
            {
                var now = DateTime.UtcNow;
                var zones = dbContext.Zones.ToList();
                var cities = dbContext.Citys.ToList();
                var rnd = new Random();

                var convoyeurs = new List<Convoyeur>();

                for (int i = 1; i <= 15; i++)
                {
                    var zone = zones[rnd.Next(zones.Count)];
                    var city = cities.Where(c => c.ZoneId == zone.Id)
                                      .OrderBy(x => rnd.Next())
                                      .First();

                    convoyeurs.Add(new Convoyeur
                    {
                        Name = $"Convoyeur {i}",
                        Matricule = $"CV-{1000 + i}",
                        Phone = $"5{rnd.Next(1000000, 9999999)}",
                        PhoneCountry = "+216",
                        PermisNumber = $"PC-{rnd.Next(10000, 99999)}",
                        Status = "ACTIVE",
                        ZoneId = zone.Id,
                        CityId = city.Id
                    });
                }

                dbContext.Convoyeurs.AddRange(convoyeurs);
                dbContext.SaveChanges();

                Console.WriteLine($"✔ {convoyeurs.Count} Convoyeurs seedés !");
            }
            // 9️⃣ Seed Trucks (Capacity in PALETTE)
            if (!dbContext.Trucks.Any())
            {
                var now = DateTime.UtcNow;
                var rnd = new Random();
                var zones = dbContext.Zones.ToList();
                var MarqueTruckIds = new[] { "Volvo", "Scania", "MAN", "Mercedes", "DAF", "Iveco", "Renault" };
                var colors = new[]
                                  {
                                    "#F5F5DC", // Beige
                                    "#0000FF", // Bleu
                                    "#FF0000", // Rouge
                                    "#808080", // Gris
                                    "#000000"  // Noir
                                };

                var statuses = new[] { "Disponible", "En mission", "Maintenance", "Hors service" };

                // Capacités palettes réalistes
                var paletteCapacities = new[] { 10, 12, 14, 18, 20, 22, 26, 30, 33 };
                if (!dbContext.TypeTrucks.Any())
                {
                    var types = new List<TypeTruck>
                    {
                        new TypeTruck { Type = "Poids lourd", Capacity = 33, Unit = "Palette" },
                        new TypeTruck { Type = "Utilitaire", Capacity = 12, Unit = "Palette" },
                        new TypeTruck { Type = "Camion moyen", Capacity = 20, Unit = "Palette" }
                    };

                    dbContext.TypeTrucks.AddRange(types);
                    dbContext.SaveChanges();

                    Console.WriteLine("✔ TypeTrucks seedés !");
                }
                if (!dbContext.MarqueTrucks.Any())
                {
                    var brandsToSeed = new List<MarqueTruck>
    {
        new MarqueTruck { Name = "Volvo" },
        new MarqueTruck { Name = "Scania" },
        new MarqueTruck { Name = "MAN" },
        new MarqueTruck { Name = "Mercedes" },
        new MarqueTruck { Name = "DAF" },
        new MarqueTruck { Name = "Iveco" },
        new MarqueTruck { Name = "Renault" }
    };

                    dbContext.MarqueTrucks.AddRange(brandsToSeed);
                    dbContext.SaveChanges();

                    Console.WriteLine("✔ MarqueTrucks seeded successfully!");
                }

                // ✅ Seed Trucks
                if (!dbContext.Trucks.Any())
                {
                    var trucks = new List<Truck>();
                    var typeVehicules = dbContext.TypeTrucks.ToList();
                    var brands = dbContext.MarqueTrucks.ToList();

					if (!typeVehicules.Any() || !brands.Any() || !zones.Any())
                    {
                        Console.WriteLine("⚠ Cannot seed trucks. Missing TypeTruck, MarqueTruck or Zone data.");
                        return;
                    }

                    for (int i = 1; i <= 25; i++)
                    {
                        var serie = (i % 2 == 0) ? "RS" : "TN";

                        int codeGouv = 100 + rnd.Next(0, 80);
                        int numero = 1000 + i;

                        var zone = zones[rnd.Next(zones.Count)];
                        var selectedType = typeVehicules[rnd.Next(typeVehicules.Count)];
                        var selectedBrand = brands[rnd.Next(brands.Count)];

                        trucks.Add(new Truck
                        {
                            Immatriculation = $"{codeGouv} {serie} {numero}",
                            MarqueTruckId = selectedBrand.Id,
                            Color = colors[rnd.Next(colors.Length)],
                            TechnicalVisitDate = now.AddMonths(rnd.Next(-6, 12)),
                            Status = statuses[rnd.Next(statuses.Length)],
                            IsEnable = true,
                            ZoneId = zone.Id,
                            TypeTruckId = selectedType.Id
                        });
                    }

                    dbContext.Trucks.AddRange(trucks);
                    dbContext.SaveChanges();

                    Console.WriteLine($"✔ {trucks.Count} Trucks seeded successfully!");
                }
            }
        }


    }

}
