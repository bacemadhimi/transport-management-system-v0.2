using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TransportManagementSystem.Entity.PlantIt
{
    [Table("tblPMMMaterial")]
    public class PMMMaterial
    {
        [Key]
        [Column("nKey")]
        public int Key { get; set; }

        [Column("szName")]
        public string Name { get; set; }

        [Column("nGroupLink")]
        public int GroupLink { get; set; }

        [Column("nMaterialClassLink")]
        public int MaterialClassLink { get; set; }

        [Column("nTextLink")]
        public int TextLink { get; set; }

        [Column("nUnitLink")]
        public int UnitLink { get; set; }

        [Column("nDensity")]
        public double Density { get; set; }

        [Column("crForeground")]
        public int Foreground { get; set; }

        [Column("crBackground")]
        public int Background { get; set; }

        [Column("bManualCheck")]
        public bool ManualCheck { get; set; }

        [Column("bAutoCheck")]
        public bool AutoCheck { get; set; }

        [Column("bLockExpiredQuants")]
        public bool LockExpiredQuants { get; set; }

        [Column("tsExpirationDuration")]
        public int ExpirationDuration { get; set; }

        [Column("nExpirationUnitLink")]
        public int ExpirationUnitLink { get; set; }

        [Column("nAssigmentMode")]
        public byte AssignmentMode { get; set; }

        // Propriétés manquantes
        [Column("nDiscreteUnitGradient")]
        public double DiscreteUnitGradient { get; set; }

        [Column("nDiscreteUnitOrdinate")]
        public double DiscreteUnitOrdinate { get; set; }

        [Column("nDiscreteUnitUnitLink")]
        public int DiscreteUnitUnitLink { get; set; }

        [Column("nDiscreteUnitNamedUnitLink")]
        public int DiscreteUnitNamedUnitLink { get; set; }

        [Column("nPackagingUnitGradient")]
        public double PackagingUnitGradient { get; set; }

        [Column("nPackagingUnitOrdinate")]
        public double PackagingUnitOrdinate { get; set; }

        [Column("nPackagingUnitUnitLink")]
        public int PackagingUnitUnitLink { get; set; }

        [Column("nPackagingUnitNamedUnitLink")]
        public int PackagingUnitNamedUnitLink { get; set; }

        [Column("nPalletUnitGradient")]
        public double PalletUnitGradient { get; set; }

        [Column("nPalletUnitOrdinate")]
        public double PalletUnitOrdinate { get; set; }

        [Column("nPalletUnitUnitLink")]
        public int PalletUnitUnitLink { get; set; }

        [Column("nPalletUnitNamedUnitLink")]
        public int PalletUnitNamedUnitLink { get; set; }

        [Column("nUserUnit1Gradient")]
        public double UserUnit1Gradient { get; set; }

        [Column("nUserUnit1Ordinate")]
        public double UserUnit1Ordinate { get; set; }

        [Column("nUserUnit1UnitLink")]
        public int UserUnit1UnitLink { get; set; }

        [Column("nUserUnit1NamedUnitLink")]
        public int UserUnit1NamedUnitLink { get; set; }

        [Column("nUserUnit2Gradient")]
        public double UserUnit2Gradient { get; set; }

        [Column("nUserUnit2Ordinate")]
        public double UserUnit2Ordinate { get; set; }

        [Column("nUserUnit2UnitLink")]
        public int UserUnit2UnitLink { get; set; }

        [Column("nUserUnit2NamedUnitLink")]
        public int UserUnit2NamedUnitLink { get; set; }

        [Column("nMemoLink")]
        public int MemoLink { get; set; }

        [Column("szUserParam1")]
        public string UserParam1 { get; set; }

        [Column("szUserParam2")]
        public string UserParam2 { get; set; }

        [Column("tLastModified")]
        public int LastModified { get; set; }

        [Column("nDerivatedUnitLink")]
        public int DerivatedUnitLink { get; set; }

        [Column("nDerivatedUnitGradient")]
        public double DerivatedUnitGradient { get; set; }

        [Column("nDerivatedUnitOrdinate")]
        public double DerivatedUnitOrdinate { get; set; }

        [Column("nBookingUnitLink")]
        public int BookingUnitLink { get; set; }

        [Column("nBookingUnitGradient")]
        public double BookingUnitGradient { get; set; }

        [Column("nBookingUnitOrdinate")]
        public double BookingUnitOrdinate { get; set; }

        [Column("nDisplayUnitLink")]
        public int DisplayUnitLink { get; set; }

        [Column("nDisplayUnitGradient")]
        public double DisplayUnitGradient { get; set; }

        [Column("nDisplayUnitOrdinate")]
        public double DisplayUnitOrdinate { get; set; }

        [Column("nUseExtendedUnits")]
        public int UseExtendedUnits { get; set; }

        [Column("nUseIntegerUnits")]
        public int UseIntegerUnits { get; set; }
    }
}