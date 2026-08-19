using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace RemoteDesk.Server.Services
{
    public interface ITokenService
    {
        string GenerateAccessToken(Guid userId, string email, string role, string sessionId);
        string GenerateRefreshToken(Guid userId, string email, string role, string sessionId);
        ClaimsPrincipal? ValidateToken(string token);
        bool RevokeSession(string sessionId);
        bool IsSessionRevoked(string sessionId);
    }

    public class TokenService : ITokenService
    {
        private readonly IConfiguration _config;
        private readonly byte[] _key;
        private static readonly HashSet<string> _revokedSessions = new();

        public TokenService(IConfiguration config)
        {
            _config = config;
            var secret = _config["Jwt:Secret"] ?? "remotedesk_super_secret_jwt_key_2026_change_in_production";
            _key = Encoding.UTF8.GetBytes(secret);
        }

        public string GenerateAccessToken(Guid userId, string email, string role, string sessionId)
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(new[]
                {
                    new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
                    new Claim(ClaimTypes.Email, email),
                    new Claim(ClaimTypes.Role, role),
                    new Claim("sessionId", sessionId),
                    new Claim("tokenType", "access")
                }),
                Expires = DateTime.UtcNow.AddHours(1),
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(_key), SecurityAlgorithms.HmacSha256Signature),
                Issuer = _config["Jwt:Issuer"] ?? "RemoteDesk.Server",
                Audience = _config["Jwt:Audience"] ?? "RemoteDesk.Clients"
            };

            var token = tokenHandler.CreateToken(tokenDescriptor);
            return tokenHandler.WriteToken(token);
        }

        public string GenerateRefreshToken(Guid userId, string email, string role, string sessionId)
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(new[]
                {
                    new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
                    new Claim(ClaimTypes.Email, email),
                    new Claim(ClaimTypes.Role, role),
                    new Claim("sessionId", sessionId),
                    new Claim("tokenType", "refresh")
                }),
                Expires = DateTime.UtcNow.AddDays(7),
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(_key), SecurityAlgorithms.HmacSha256Signature),
                Issuer = _config["Jwt:Issuer"] ?? "RemoteDesk.Server",
                Audience = _config["Jwt:Audience"] ?? "RemoteDesk.Clients"
            };

            var token = tokenHandler.CreateToken(tokenDescriptor);
            return tokenHandler.WriteToken(token);
        }

        public ClaimsPrincipal? ValidateToken(string token)
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            try
            {
                var principal = tokenHandler.ValidateToken(token, new TokenValidationParameters
                {
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(_key),
                    ValidateIssuer = true,
                    ValidIssuer = _config["Jwt:Issuer"] ?? "RemoteDesk.Server",
                    ValidateAudience = true,
                    ValidAudience = _config["Jwt:Audience"] ?? "RemoteDesk.Clients",
                    ClockSkew = TimeSpan.Zero
                }, out var validatedToken);

                var sessionId = principal.FindFirst("sessionId")?.Value;
                if (sessionId != null && IsSessionRevoked(sessionId))
                {
                    return null;
                }

                return principal;
            }
            catch
            {
                return null;
            }
        }

        public bool RevokeSession(string sessionId)
        {
            lock (_revokedSessions)
            {
                return _revokedSessions.Add(sessionId);
            }
        }

        public bool IsSessionRevoked(string sessionId)
        {
            lock (_revokedSessions)
            {
                return _revokedSessions.Contains(sessionId);
            }
        }
    }
}
