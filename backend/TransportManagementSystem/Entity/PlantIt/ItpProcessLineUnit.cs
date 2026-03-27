// Entities/PlantIt/ItpProcessLineUnit.cs
using Microsoft.EntityFrameworkCore;
using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TransportManagementSystem.Entity.PlantIt
{
    [Table("tblItpProcessLineUnit", Schema = "dbo")]
    [PrimaryKey(nameof(ProcessLineLink), nameof(ProcessUnitLink))]
    public class ItpProcessLineUnit
    {
        [Column("nProcessLineLink")]
        public int ProcessLineLink { get; set; }

        [Column("nProcessUnitLink")]
        public int ProcessUnitLink { get; set; }

        [Column("bActive")]
        public bool Active { get; set; }

        [Column("tLastModified")]
        public int LastModified { get; set; }
    }

}