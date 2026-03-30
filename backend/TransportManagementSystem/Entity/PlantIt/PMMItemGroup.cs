using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

[Table("tblPMMItemGroup")]
public class PMMItemGroup
{
    [Key]
    [Column("nKey")]
    public int Key { get; set; }

    [Column("szName")]
    public string Name { get; set; }

    [Column("nTextLink")]
    public int TextLink { get; set; }

    [Column("nItemGroupType")]
    public int ItemGroupType { get; set; }

    [Column("nMemoLink")]
    public int MemoLink { get; set; }

    [Column("szUserParam1")]
    public string UserParam1 { get; set; }

    [Column("szUserParam2")]
    public string UserParam2 { get; set; }

    [Column("tLastModified")]
    public int LastModified { get; set; }
}