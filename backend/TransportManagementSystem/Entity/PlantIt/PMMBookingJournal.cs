using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TransportManagementSystem.Entity.PlantIt
{
    public class PMMBookingJournal
    {
        [Key]
        public int nKey { get; set; }
        public int nQuantLink { get; set; }
        public int nBookingTypeLink { get; set; }
        public int nBookingKeyLink { get; set; }
        public byte nStockRotationType { get; set; }
        public decimal nQuantity { get; set; }
        public int nCauseBookingLink { get; set; }
        public int nCancelBookingLink { get; set; }
        public int nSourceQuantLink { get; set; }
        public int nDestQuantLink { get; set; }
        public string szJobNumber { get; set; }
        public int nJobID { get; set; }
        public int nBatchNumber { get; set; }
        public int nStepNumber { get; set; }
        public int nBatchLine { get; set; }
        public int nMemoLink { get; set; }
        public string szCreateUserName { get; set; }
        public string szCompleteUserName { get; set; }
        public int tBooking { get; set; }
        public int tCompleted { get; set; }
        public int tCreated { get; set; }
        public int nDataXLink { get; set; }
        public int nRunID { get; set; }
        public string szStepName { get; set; }
        public string szStepLocalName { get; set; }
        public string szStepGlobalName { get; set; }
        public string szBatchLineName { get; set; }
        public string szBatchLineLocalName { get; set; }
        public string szBatchLineGlobalName { get; set; }
        public string szSUJobNumber { get; set; }
        public int nSUJobID { get; set; }
        public int nSUBatchNumber { get; set; }
        public int nSUStepNumber { get; set; }
        public string szSUStepName { get; set; }
        public string szSUStepLocalName { get; set; }
        public string szSUStepGlobalName { get; set; }
    }
}
