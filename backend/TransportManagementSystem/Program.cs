using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Text.Json.Serialization;
using TransportManagementSystem.Data;
using TransportManagementSystem.Entity;
using TransportManagementSystem.Service;
using TransportManagementSystem.Services;

var builder = WebApplication.CreateBuilder(args);


builder.Services
    .AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
        options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
    });
builder.Services.AddHttpClient();
builder.Services.AddOpenApi();

builder.Services.AddCors(option =>
{
    option.AddPolicy("AllowCrosOrigin", policy =>
    {
        policy.AllowAnyOrigin();
        policy.AllowAnyMethod();
        policy.AllowAnyHeader();
    });
});
builder.Services.AddDbContext<QadDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("QadConnection")));

builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("DefaultConnection"),
        sqlOptions => sqlOptions.EnableRetryOnFailure(
            maxRetryCount: 5,                    
            maxRetryDelay: TimeSpan.FromSeconds(10), 
            errorNumbersToAdd: null               
        )
    )
    .EnableSensitiveDataLogging()
    .EnableDetailedErrors()
);

builder.Services.AddScoped<IRepository<User>, Repository<User>>();
builder.Services.AddScoped<IRepository<Driver>, Repository<Driver>>();
builder.Services.AddScoped<IRepository<Truck>, Repository<Truck>>();
builder.Services.AddScoped<IRepository<Trip>, Repository<Trip>>();
builder.Services.AddScoped<IRepository<Fuel>, Repository<Fuel>>();
builder.Services.AddScoped<IRepository<UserGroup>, Repository<UserGroup>>();
builder.Services.AddScoped<IRepository<UserRight>, Repository<UserRight>>();
builder.Services.AddScoped<IRepository<UserGroup2Right>, Repository<UserGroup2Right>>();
builder.Services.AddScoped<IRepository<UserGroup2User>, Repository<UserGroup2User>>();
builder.Services.AddScoped<IRepository<Location>, Repository<Location>>();
builder.Services.AddScoped<IRepository<City>, Repository<City>>();


builder.Services.AddScoped<UserHelper>();
builder.Services.AddScoped<SyncService>();
builder.Services.AddScoped<OrderSyncService>();


builder.Services.AddScoped<IRepository<Customer>, Repository<Customer>>();
builder.Services.AddScoped<IRepository<Delivery>, Repository<Delivery>>();
builder.Services.AddScoped<IRepository<Order>, Repository<Order>>();

builder.Services.AddSingleton<IConfiguration>(builder.Configuration);
builder.Services.AddScoped<IRepository<MarqueTruck>, Repository<MarqueTruck>>();
builder.Services.AddScoped<IRepository<Zone>, Repository<Zone>>();
builder.Services.AddScoped<IStatisticsService, StatisticsService>();


builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)

    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters()
        {
            ValidateIssuer = false,
            ValidateAudience = false,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(builder.Configuration.GetValue<string>("JwtKey")!)
            )
        };
    });

builder.Services.AddAuthorization();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.Http,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Description = "Enter a valid token"
    });

    c.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
    {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

var app = builder.Build();


using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    dbContext.Database.Migrate();
 
    var dataSeedHelper = new DataSeedHelper(dbContext);
    dataSeedHelper.InsertData();
}


if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowCrosOrigin");
app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.Run();
