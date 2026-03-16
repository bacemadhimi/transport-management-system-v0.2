using System.Collections.Generic;
using Microsoft.AspNetCore.Mvc.ModelBinding;

namespace TransportManagementSystem.Models
{
    public class ApiResponse
    {
        public bool Success { get; set; }
        public string Message { get; set; }
        public object Data { get; set; }
        public ModelStateDictionary ModelState { get; set; }

        public ApiResponse(bool success, string message, object data = null)
        {
            Success = success;
            Message = message;
            Data = data;
        }

        public ApiResponse(bool success, string message, ModelStateDictionary modelState)
        {
            Success = success;
            Message = message;
            ModelState = modelState;
        }
    }
}