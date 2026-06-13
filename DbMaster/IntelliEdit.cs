using System;
using System.CodeDom.Compiler;
using System.Collections;
using System.ComponentModel;
using System.ComponentModel.Design;
using System.Data;
using System.Diagnostics;
using System.Globalization;
using System.IO;
using System.Runtime.Serialization;
using System.Text;
using System.Windows.Forms;
using System.Xml;
using System.Xml.Schema;
using System.Xml.Serialization;
using FifaLibrary;

namespace DbMaster;

[Serializable]
[DesignerCategory("code")]
[HelpKeyword("vs.data.DataSet")]
[XmlSchemaProvider("GetTypedDataSetSchema")]
[XmlRoot("IntelliEdit")]
[ToolboxItem(true)]
public class IntelliEdit : DataSet
{
	[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
	public delegate void CrossTableRowChangeEventHandler(object sender, CrossTableRowChangeEvent e);

	[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
	public delegate void DomainListRowChangeEventHandler(object sender, DomainListRowChangeEvent e);

	[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
	public delegate void UseDomainRowChangeEventHandler(object sender, UseDomainRowChangeEvent e);

	[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
	public delegate void DoubleCrossTableRowChangeEventHandler(object sender, DoubleCrossTableRowChangeEvent e);

	[Serializable]
	[XmlSchemaProvider("GetTypedTableSchema")]
	public class CrossTableDataTable : TypedTableBase<CrossTableRow>
	{
		private DataColumn columnSourceTable;

		private DataColumn columnSourceColumn;

		private DataColumn columnReferredTable;

		private DataColumn columnKeyColumn;

		private DataColumn columnDisplayColumn;

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public DataColumn SourceTableColumn => columnSourceTable;

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public DataColumn SourceColumnColumn => columnSourceColumn;

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public DataColumn ReferredTableColumn => columnReferredTable;

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public DataColumn KeyColumnColumn => columnKeyColumn;

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public DataColumn DisplayColumnColumn => columnDisplayColumn;

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[Browsable(false)]
		[DebuggerNonUserCode]
		public int Count => base.Rows.Count;

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public CrossTableRow this[int index] => (CrossTableRow)base.Rows[index];

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public event CrossTableRowChangeEventHandler CrossTableRowChanging;

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public event CrossTableRowChangeEventHandler CrossTableRowChanged;

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public event CrossTableRowChangeEventHandler CrossTableRowDeleting;

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public event CrossTableRowChangeEventHandler CrossTableRowDeleted;

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public CrossTableDataTable()
		{
			base.TableName = "CrossTable";
			BeginInit();
			InitClass();
			EndInit();
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		internal CrossTableDataTable(DataTable table)
		{
			base.TableName = table.TableName;
			if (table.CaseSensitive != table.DataSet.CaseSensitive)
			{
				base.CaseSensitive = table.CaseSensitive;
			}
			if (table.Locale.ToString() != table.DataSet.Locale.ToString())
			{
				base.Locale = table.Locale;
			}
			if (table.Namespace != table.DataSet.Namespace)
			{
				base.Namespace = table.Namespace;
			}
			base.Prefix = table.Prefix;
			base.MinimumCapacity = table.MinimumCapacity;
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		protected CrossTableDataTable(SerializationInfo info, StreamingContext context)
			: base(info, context)
		{
			InitVars();
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public void AddCrossTableRow(CrossTableRow row)
		{
			base.Rows.Add(row);
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public CrossTableRow AddCrossTableRow(string SourceTable, string SourceColumn, string ReferredTable, string KeyColumn, string DisplayColumn)
		{
			CrossTableRow crossTableRow = (CrossTableRow)NewRow();
			object[] itemArray = new object[5] { SourceTable, SourceColumn, ReferredTable, KeyColumn, DisplayColumn };
			crossTableRow.ItemArray = itemArray;
			base.Rows.Add(crossTableRow);
			return crossTableRow;
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public override DataTable Clone()
		{
			CrossTableDataTable crossTableDataTable = (CrossTableDataTable)base.Clone();
			crossTableDataTable.InitVars();
			return crossTableDataTable;
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		protected override DataTable CreateInstance()
		{
			return new CrossTableDataTable();
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		internal void InitVars()
		{
			columnSourceTable = base.Columns["SourceTable"];
			columnSourceColumn = base.Columns["SourceColumn"];
			columnReferredTable = base.Columns["ReferredTable"];
			columnKeyColumn = base.Columns["KeyColumn"];
			columnDisplayColumn = base.Columns["DisplayColumn"];
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		private void InitClass()
		{
			columnSourceTable = new DataColumn("SourceTable", typeof(string), null, MappingType.Element);
			base.Columns.Add(columnSourceTable);
			columnSourceColumn = new DataColumn("SourceColumn", typeof(string), null, MappingType.Element);
			base.Columns.Add(columnSourceColumn);
			columnReferredTable = new DataColumn("ReferredTable", typeof(string), null, MappingType.Element);
			base.Columns.Add(columnReferredTable);
			columnKeyColumn = new DataColumn("KeyColumn", typeof(string), null, MappingType.Element);
			base.Columns.Add(columnKeyColumn);
			columnDisplayColumn = new DataColumn("DisplayColumn", typeof(string), null, MappingType.Element);
			base.Columns.Add(columnDisplayColumn);
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public CrossTableRow NewCrossTableRow()
		{
			return (CrossTableRow)NewRow();
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		protected override DataRow NewRowFromBuilder(DataRowBuilder builder)
		{
			return new CrossTableRow(builder);
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		protected override Type GetRowType()
		{
			return typeof(CrossTableRow);
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		protected override void OnRowChanged(DataRowChangeEventArgs e)
		{
			base.OnRowChanged(e);
			if (this.CrossTableRowChanged != null)
			{
				this.CrossTableRowChanged(this, new CrossTableRowChangeEvent((CrossTableRow)e.Row, e.Action));
			}
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		protected override void OnRowChanging(DataRowChangeEventArgs e)
		{
			base.OnRowChanging(e);
			if (this.CrossTableRowChanging != null)
			{
				this.CrossTableRowChanging(this, new CrossTableRowChangeEvent((CrossTableRow)e.Row, e.Action));
			}
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		protected override void OnRowDeleted(DataRowChangeEventArgs e)
		{
			base.OnRowDeleted(e);
			if (this.CrossTableRowDeleted != null)
			{
				this.CrossTableRowDeleted(this, new CrossTableRowChangeEvent((CrossTableRow)e.Row, e.Action));
			}
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		protected override void OnRowDeleting(DataRowChangeEventArgs e)
		{
			base.OnRowDeleting(e);
			if (this.CrossTableRowDeleting != null)
			{
				this.CrossTableRowDeleting(this, new CrossTableRowChangeEvent((CrossTableRow)e.Row, e.Action));
			}
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public void RemoveCrossTableRow(CrossTableRow row)
		{
			base.Rows.Remove(row);
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public static XmlSchemaComplexType GetTypedTableSchema(XmlSchemaSet xs)
		{
			//IL_0000: Unknown result type (might be due to invalid IL or missing references)
			//IL_0006: Expected O, but got Unknown
			//IL_0006: Unknown result type (might be due to invalid IL or missing references)
			//IL_000c: Expected O, but got Unknown
			//IL_0012: Unknown result type (might be due to invalid IL or missing references)
			//IL_0018: Expected O, but got Unknown
			//IL_0053: Unknown result type (might be due to invalid IL or missing references)
			//IL_005a: Expected O, but got Unknown
			//IL_0089: Unknown result type (might be due to invalid IL or missing references)
			//IL_0090: Expected O, but got Unknown
			//IL_00b7: Unknown result type (might be due to invalid IL or missing references)
			//IL_00be: Expected O, but got Unknown
			//IL_013c: Unknown result type (might be due to invalid IL or missing references)
			//IL_0143: Expected O, but got Unknown
			XmlSchemaComplexType val = new XmlSchemaComplexType();
			XmlSchemaSequence val2 = new XmlSchemaSequence();
			IntelliEdit intelliEdit = new IntelliEdit();
			XmlSchemaAny val3 = new XmlSchemaAny();
			val3.Namespace = "http://www.w3.org/2001/XMLSchema";
			((XmlSchemaParticle)val3).MinOccurs = 0m;
			((XmlSchemaParticle)val3).MaxOccurs = decimal.MaxValue;
			val3.ProcessContents = (XmlSchemaContentProcessing)2;
			((XmlSchemaGroupBase)val2).Items.Add((XmlSchemaObject)(object)val3);
			XmlSchemaAny val4 = new XmlSchemaAny();
			val4.Namespace = "urn:schemas-microsoft-com:xml-diffgram-v1";
			((XmlSchemaParticle)val4).MinOccurs = 1m;
			val4.ProcessContents = (XmlSchemaContentProcessing)2;
			((XmlSchemaGroupBase)val2).Items.Add((XmlSchemaObject)(object)val4);
			XmlSchemaAttribute val5 = new XmlSchemaAttribute();
			val5.Name = "namespace";
			val5.FixedValue = intelliEdit.Namespace;
			val.Attributes.Add((XmlSchemaObject)(object)val5);
			XmlSchemaAttribute val6 = new XmlSchemaAttribute();
			val6.Name = "tableTypeName";
			val6.FixedValue = "CrossTableDataTable";
			val.Attributes.Add((XmlSchemaObject)(object)val6);
			val.Particle = (XmlSchemaParticle)(object)val2;
			XmlSchema schemaSerializable = intelliEdit.GetSchemaSerializable();
			if (xs.Contains(schemaSerializable.TargetNamespace))
			{
				MemoryStream memoryStream = new MemoryStream();
				MemoryStream memoryStream2 = new MemoryStream();
				try
				{
					XmlSchema val7 = null;
					schemaSerializable.Write((Stream)memoryStream);
					IEnumerator enumerator = xs.Schemas(schemaSerializable.TargetNamespace).GetEnumerator();
					while (enumerator.MoveNext())
					{
						val7 = (XmlSchema)enumerator.Current;
						memoryStream2.SetLength(0L);
						val7.Write((Stream)memoryStream2);
						if (memoryStream.Length == memoryStream2.Length)
						{
							memoryStream.Position = 0L;
							memoryStream2.Position = 0L;
							while (memoryStream.Position != memoryStream.Length && memoryStream.ReadByte() == memoryStream2.ReadByte())
							{
							}
							if (memoryStream.Position == memoryStream.Length)
							{
								return val;
							}
						}
					}
				}
				finally
				{
					memoryStream?.Close();
					memoryStream2?.Close();
				}
			}
			xs.Add(schemaSerializable);
			return val;
		}
	}

	[Serializable]
	[XmlSchemaProvider("GetTypedTableSchema")]
	public class DomainListDataTable : TypedTableBase<DomainListRow>
	{
		private DataColumn columnName;

		private DataColumn columnTotalValues;

		private DataColumn columnValue0;

		private DataColumn columnValue1;

		private DataColumn columnValue2;

		private DataColumn columnValue3;

		private DataColumn columnValue4;

		private DataColumn columnValue5;

		private DataColumn columnValue6;

		private DataColumn columnValue7;

		private DataColumn columnValue8;

		private DataColumn columnValue9;

		private DataColumn columnValue10;

		private DataColumn columnValue11;

		private DataColumn columnValue12;

		private DataColumn columnValue13;

		private DataColumn columnValue14;

		private DataColumn columnValue15;

		private DataColumn columnValue16;

		private DataColumn columnValue17;

		private DataColumn columnValue18;

		private DataColumn columnValue19;

		private DataColumn columnValue20;

		private DataColumn columnValue21;

		private DataColumn columnValue22;

		private DataColumn columnValue23;

		private DataColumn columnValue24;

		private DataColumn columnValue25;

		private DataColumn columnValue26;

		private DataColumn columnValue27;

		private DataColumn columnValue28;

		private DataColumn columnValue29;

		private DataColumn columnValue30;

		private DataColumn columnValue31;

		private DataColumn columnValue32;

		private DataColumn columnValue33;

		private DataColumn columnValue34;

		private DataColumn columnValue35;

		private DataColumn columnValue36;

		private DataColumn columnValue37;

		private DataColumn columnValue38;

		private DataColumn columnValue39;

		private DataColumn columnValue40;

		private DataColumn columnValue41;

		private DataColumn columnValue42;

		private DataColumn columnValue43;

		private DataColumn columnValue44;

		private DataColumn columnValue45;

		private DataColumn columnValue46;

		private DataColumn columnValue47;

		private DataColumn columnValue48;

		private DataColumn columnValue49;

		private DataColumn columnValue50;

		private DataColumn columnValue51;

		private DataColumn columnValue52;

		private DataColumn columnValue53;

		private DataColumn columnValue54;

		private DataColumn columnValue55;

		private DataColumn columnValue56;

		private DataColumn columnValue57;

		private DataColumn columnValue58;

		private DataColumn columnValue59;

		private DataColumn columnValue60;

		private DataColumn columnValue61;

		private DataColumn columnValue62;

		private DataColumn columnValue63;

		private DataColumn columnValue64;

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public DataColumn NameColumn => columnName;

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public DataColumn TotalValuesColumn => columnTotalValues;

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public DataColumn Value0Column => columnValue0;

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public DataColumn Value1Column => columnValue1;

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public DataColumn Value2Column => columnValue2;

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public DataColumn Value3Column => columnValue3;

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public DataColumn Value4Column => columnValue4;

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public DataColumn Value5Column => columnValue5;

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public DataColumn Value6Column => columnValue6;

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public DataColumn Value7Column => columnValue7;

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public DataColumn Value8Column => columnValue8;

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public DataColumn Value9Column => columnValue9;

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public DataColumn Value10Column => columnValue10;

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public DataColumn Value11Column => columnValue11;

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public DataColumn Value12Column => columnValue12;

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public DataColumn Value13Column => columnValue13;

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public DataColumn Value14Column => columnValue14;

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public DataColumn Value15Column => columnValue15;

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public DataColumn Value16Column => columnValue16;

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public DataColumn Value17Column => columnValue17;

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public DataColumn Value18Column => columnValue18;

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public DataColumn Value19Column => columnValue19;

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public DataColumn Value20Column => columnValue20;

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public DataColumn Value21Column => columnValue21;

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public DataColumn Value22Column => columnValue22;

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public DataColumn Value23Column => columnValue23;

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public DataColumn Value24Column => columnValue24;

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public DataColumn Value25Column => columnValue25;

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public DataColumn Value26Column => columnValue26;

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public DataColumn Value27Column => columnValue27;

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public DataColumn Value28Column => columnValue28;

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public DataColumn Value29Column => columnValue29;

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public DataColumn Value30Column => columnValue30;

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public DataColumn Value31Column => columnValue31;

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public DataColumn Value32Column => columnValue32;

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public DataColumn Value33Column => columnValue33;

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public DataColumn Value34Column => columnValue34;

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public DataColumn Value35Column => columnValue35;

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public DataColumn Value36Column => columnValue36;

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public DataColumn Value37Column => columnValue37;

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public DataColumn Value38Column => columnValue38;

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public DataColumn Value39Column => columnValue39;

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public DataColumn Value40Column => columnValue40;

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public DataColumn Value41Column => columnValue41;

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public DataColumn Value42Column => columnValue42;

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public DataColumn Value43Column => columnValue43;

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public DataColumn Value44Column => columnValue44;

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public DataColumn Value45Column => columnValue45;

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public DataColumn Value46Column => columnValue46;

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public DataColumn Value47Column => columnValue47;

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public DataColumn Value48Column => columnValue48;

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public DataColumn Value49Column => columnValue49;

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public DataColumn Value50Column => columnValue50;

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public DataColumn Value51Column => columnValue51;

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public DataColumn Value52Column => columnValue52;

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public DataColumn Value53Column => columnValue53;

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public DataColumn Value54Column => columnValue54;

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public DataColumn Value55Column => columnValue55;

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public DataColumn Value56Column => columnValue56;

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public DataColumn Value57Column => columnValue57;

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public DataColumn Value58Column => columnValue58;

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public DataColumn Value59Column => columnValue59;

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public DataColumn Value60Column => columnValue60;

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public DataColumn Value61Column => columnValue61;

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public DataColumn Value62Column => columnValue62;

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public DataColumn Value63Column => columnValue63;

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public DataColumn Value64Column => columnValue64;

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[Browsable(false)]
		public int Count => base.Rows.Count;

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public DomainListRow this[int index] => (DomainListRow)base.Rows[index];

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public event DomainListRowChangeEventHandler DomainListRowChanging;

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public event DomainListRowChangeEventHandler DomainListRowChanged;

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public event DomainListRowChangeEventHandler DomainListRowDeleting;

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public event DomainListRowChangeEventHandler DomainListRowDeleted;

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public DomainListDataTable()
		{
			base.TableName = "DomainList";
			BeginInit();
			InitClass();
			EndInit();
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		internal DomainListDataTable(DataTable table)
		{
			base.TableName = table.TableName;
			if (table.CaseSensitive != table.DataSet.CaseSensitive)
			{
				base.CaseSensitive = table.CaseSensitive;
			}
			if (table.Locale.ToString() != table.DataSet.Locale.ToString())
			{
				base.Locale = table.Locale;
			}
			if (table.Namespace != table.DataSet.Namespace)
			{
				base.Namespace = table.Namespace;
			}
			base.Prefix = table.Prefix;
			base.MinimumCapacity = table.MinimumCapacity;
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		protected DomainListDataTable(SerializationInfo info, StreamingContext context)
			: base(info, context)
		{
			InitVars();
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public void AddDomainListRow(DomainListRow row)
		{
			base.Rows.Add(row);
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public DomainListRow AddDomainListRow(string Name, int TotalValues, string Value0, string Value1, string Value2, string Value3, string Value4, string Value5, string Value6, string Value7, string Value8, string Value9, string Value10, string Value11, string Value12, string Value13, string Value14, string Value15, string Value16, string Value17, string Value18, string Value19, string Value20, string Value21, string Value22, string Value23, string Value24, string Value25, string Value26, string Value27, string Value28, string Value29, string Value30, string Value31, string Value32, string Value33, string Value34, string Value35, string Value36, string Value37, string Value38, string Value39, string Value40, string Value41, string Value42, string Value43, string Value44, string Value45, string Value46, string Value47, string Value48, string Value49, string Value50, string Value51, string Value52, string Value53, string Value54, string Value55, string Value56, string Value57, string Value58, string Value59, string Value60, string Value61, string Value62, string Value63, string Value64)
		{
			DomainListRow domainListRow = (DomainListRow)NewRow();
			object[] itemArray = new object[67]
			{
				Name, TotalValues, Value0, Value1, Value2, Value3, Value4, Value5, Value6, Value7,
				Value8, Value9, Value10, Value11, Value12, Value13, Value14, Value15, Value16, Value17,
				Value18, Value19, Value20, Value21, Value22, Value23, Value24, Value25, Value26, Value27,
				Value28, Value29, Value30, Value31, Value32, Value33, Value34, Value35, Value36, Value37,
				Value38, Value39, Value40, Value41, Value42, Value43, Value44, Value45, Value46, Value47,
				Value48, Value49, Value50, Value51, Value52, Value53, Value54, Value55, Value56, Value57,
				Value58, Value59, Value60, Value61, Value62, Value63, Value64
			};
			domainListRow.ItemArray = itemArray;
			base.Rows.Add(domainListRow);
			return domainListRow;
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public override DataTable Clone()
		{
			DomainListDataTable domainListDataTable = (DomainListDataTable)base.Clone();
			domainListDataTable.InitVars();
			return domainListDataTable;
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		protected override DataTable CreateInstance()
		{
			return new DomainListDataTable();
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		internal void InitVars()
		{
			columnName = base.Columns["Name"];
			columnTotalValues = base.Columns["TotalValues"];
			columnValue0 = base.Columns["Value0"];
			columnValue1 = base.Columns["Value1"];
			columnValue2 = base.Columns["Value2"];
			columnValue3 = base.Columns["Value3"];
			columnValue4 = base.Columns["Value4"];
			columnValue5 = base.Columns["Value5"];
			columnValue6 = base.Columns["Value6"];
			columnValue7 = base.Columns["Value7"];
			columnValue8 = base.Columns["Value8"];
			columnValue9 = base.Columns["Value9"];
			columnValue10 = base.Columns["Value10"];
			columnValue11 = base.Columns["Value11"];
			columnValue12 = base.Columns["Value12"];
			columnValue13 = base.Columns["Value13"];
			columnValue14 = base.Columns["Value14"];
			columnValue15 = base.Columns["Value15"];
			columnValue16 = base.Columns["Value16"];
			columnValue17 = base.Columns["Value17"];
			columnValue18 = base.Columns["Value18"];
			columnValue19 = base.Columns["Value19"];
			columnValue20 = base.Columns["Value20"];
			columnValue21 = base.Columns["Value21"];
			columnValue22 = base.Columns["Value22"];
			columnValue23 = base.Columns["Value23"];
			columnValue24 = base.Columns["Value24"];
			columnValue25 = base.Columns["Value25"];
			columnValue26 = base.Columns["Value26"];
			columnValue27 = base.Columns["Value27"];
			columnValue28 = base.Columns["Value28"];
			columnValue29 = base.Columns["Value29"];
			columnValue30 = base.Columns["Value30"];
			columnValue31 = base.Columns["Value31"];
			columnValue32 = base.Columns["Value32"];
			columnValue33 = base.Columns["Value33"];
			columnValue34 = base.Columns["Value34"];
			columnValue35 = base.Columns["Value35"];
			columnValue36 = base.Columns["Value36"];
			columnValue37 = base.Columns["Value37"];
			columnValue38 = base.Columns["Value38"];
			columnValue39 = base.Columns["Value39"];
			columnValue40 = base.Columns["Value40"];
			columnValue41 = base.Columns["Value41"];
			columnValue42 = base.Columns["Value42"];
			columnValue43 = base.Columns["Value43"];
			columnValue44 = base.Columns["Value44"];
			columnValue45 = base.Columns["Value45"];
			columnValue46 = base.Columns["Value46"];
			columnValue47 = base.Columns["Value47"];
			columnValue48 = base.Columns["Value48"];
			columnValue49 = base.Columns["Value49"];
			columnValue50 = base.Columns["Value50"];
			columnValue51 = base.Columns["Value51"];
			columnValue52 = base.Columns["Value52"];
			columnValue53 = base.Columns["Value53"];
			columnValue54 = base.Columns["Value54"];
			columnValue55 = base.Columns["Value55"];
			columnValue56 = base.Columns["Value56"];
			columnValue57 = base.Columns["Value57"];
			columnValue58 = base.Columns["Value58"];
			columnValue59 = base.Columns["Value59"];
			columnValue60 = base.Columns["Value60"];
			columnValue61 = base.Columns["Value61"];
			columnValue62 = base.Columns["Value62"];
			columnValue63 = base.Columns["Value63"];
			columnValue64 = base.Columns["Value64"];
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		private void InitClass()
		{
			columnName = new DataColumn("Name", typeof(string), null, MappingType.Element);
			base.Columns.Add(columnName);
			columnTotalValues = new DataColumn("TotalValues", typeof(int), null, MappingType.Element);
			base.Columns.Add(columnTotalValues);
			columnValue0 = new DataColumn("Value0", typeof(string), null, MappingType.Element);
			base.Columns.Add(columnValue0);
			columnValue1 = new DataColumn("Value1", typeof(string), null, MappingType.Element);
			base.Columns.Add(columnValue1);
			columnValue2 = new DataColumn("Value2", typeof(string), null, MappingType.Element);
			base.Columns.Add(columnValue2);
			columnValue3 = new DataColumn("Value3", typeof(string), null, MappingType.Element);
			base.Columns.Add(columnValue3);
			columnValue4 = new DataColumn("Value4", typeof(string), null, MappingType.Element);
			base.Columns.Add(columnValue4);
			columnValue5 = new DataColumn("Value5", typeof(string), null, MappingType.Element);
			base.Columns.Add(columnValue5);
			columnValue6 = new DataColumn("Value6", typeof(string), null, MappingType.Element);
			base.Columns.Add(columnValue6);
			columnValue7 = new DataColumn("Value7", typeof(string), null, MappingType.Element);
			base.Columns.Add(columnValue7);
			columnValue8 = new DataColumn("Value8", typeof(string), null, MappingType.Element);
			base.Columns.Add(columnValue8);
			columnValue9 = new DataColumn("Value9", typeof(string), null, MappingType.Element);
			base.Columns.Add(columnValue9);
			columnValue10 = new DataColumn("Value10", typeof(string), null, MappingType.Element);
			base.Columns.Add(columnValue10);
			columnValue11 = new DataColumn("Value11", typeof(string), null, MappingType.Element);
			base.Columns.Add(columnValue11);
			columnValue12 = new DataColumn("Value12", typeof(string), null, MappingType.Element);
			base.Columns.Add(columnValue12);
			columnValue13 = new DataColumn("Value13", typeof(string), null, MappingType.Element);
			base.Columns.Add(columnValue13);
			columnValue14 = new DataColumn("Value14", typeof(string), null, MappingType.Element);
			base.Columns.Add(columnValue14);
			columnValue15 = new DataColumn("Value15", typeof(string), null, MappingType.Element);
			base.Columns.Add(columnValue15);
			columnValue16 = new DataColumn("Value16", typeof(string), null, MappingType.Element);
			base.Columns.Add(columnValue16);
			columnValue17 = new DataColumn("Value17", typeof(string), null, MappingType.Element);
			base.Columns.Add(columnValue17);
			columnValue18 = new DataColumn("Value18", typeof(string), null, MappingType.Element);
			base.Columns.Add(columnValue18);
			columnValue19 = new DataColumn("Value19", typeof(string), null, MappingType.Element);
			base.Columns.Add(columnValue19);
			columnValue20 = new DataColumn("Value20", typeof(string), null, MappingType.Element);
			base.Columns.Add(columnValue20);
			columnValue21 = new DataColumn("Value21", typeof(string), null, MappingType.Element);
			base.Columns.Add(columnValue21);
			columnValue22 = new DataColumn("Value22", typeof(string), null, MappingType.Element);
			base.Columns.Add(columnValue22);
			columnValue23 = new DataColumn("Value23", typeof(string), null, MappingType.Element);
			base.Columns.Add(columnValue23);
			columnValue24 = new DataColumn("Value24", typeof(string), null, MappingType.Element);
			base.Columns.Add(columnValue24);
			columnValue25 = new DataColumn("Value25", typeof(string), null, MappingType.Element);
			base.Columns.Add(columnValue25);
			columnValue26 = new DataColumn("Value26", typeof(string), null, MappingType.Element);
			base.Columns.Add(columnValue26);
			columnValue27 = new DataColumn("Value27", typeof(string), null, MappingType.Element);
			base.Columns.Add(columnValue27);
			columnValue28 = new DataColumn("Value28", typeof(string), null, MappingType.Element);
			base.Columns.Add(columnValue28);
			columnValue29 = new DataColumn("Value29", typeof(string), null, MappingType.Element);
			base.Columns.Add(columnValue29);
			columnValue30 = new DataColumn("Value30", typeof(string), null, MappingType.Element);
			base.Columns.Add(columnValue30);
			columnValue31 = new DataColumn("Value31", typeof(string), null, MappingType.Element);
			base.Columns.Add(columnValue31);
			columnValue32 = new DataColumn("Value32", typeof(string), null, MappingType.Element);
			base.Columns.Add(columnValue32);
			columnValue33 = new DataColumn("Value33", typeof(string), null, MappingType.Element);
			base.Columns.Add(columnValue33);
			columnValue34 = new DataColumn("Value34", typeof(string), null, MappingType.Element);
			base.Columns.Add(columnValue34);
			columnValue35 = new DataColumn("Value35", typeof(string), null, MappingType.Element);
			base.Columns.Add(columnValue35);
			columnValue36 = new DataColumn("Value36", typeof(string), null, MappingType.Element);
			base.Columns.Add(columnValue36);
			columnValue37 = new DataColumn("Value37", typeof(string), null, MappingType.Element);
			base.Columns.Add(columnValue37);
			columnValue38 = new DataColumn("Value38", typeof(string), null, MappingType.Element);
			base.Columns.Add(columnValue38);
			columnValue39 = new DataColumn("Value39", typeof(string), null, MappingType.Element);
			base.Columns.Add(columnValue39);
			columnValue40 = new DataColumn("Value40", typeof(string), null, MappingType.Element);
			base.Columns.Add(columnValue40);
			columnValue41 = new DataColumn("Value41", typeof(string), null, MappingType.Element);
			base.Columns.Add(columnValue41);
			columnValue42 = new DataColumn("Value42", typeof(string), null, MappingType.Element);
			base.Columns.Add(columnValue42);
			columnValue43 = new DataColumn("Value43", typeof(string), null, MappingType.Element);
			base.Columns.Add(columnValue43);
			columnValue44 = new DataColumn("Value44", typeof(string), null, MappingType.Element);
			base.Columns.Add(columnValue44);
			columnValue45 = new DataColumn("Value45", typeof(string), null, MappingType.Element);
			base.Columns.Add(columnValue45);
			columnValue46 = new DataColumn("Value46", typeof(string), null, MappingType.Element);
			base.Columns.Add(columnValue46);
			columnValue47 = new DataColumn("Value47", typeof(string), null, MappingType.Element);
			base.Columns.Add(columnValue47);
			columnValue48 = new DataColumn("Value48", typeof(string), null, MappingType.Element);
			base.Columns.Add(columnValue48);
			columnValue49 = new DataColumn("Value49", typeof(string), null, MappingType.Element);
			base.Columns.Add(columnValue49);
			columnValue50 = new DataColumn("Value50", typeof(string), null, MappingType.Element);
			base.Columns.Add(columnValue50);
			columnValue51 = new DataColumn("Value51", typeof(string), null, MappingType.Element);
			base.Columns.Add(columnValue51);
			columnValue52 = new DataColumn("Value52", typeof(string), null, MappingType.Element);
			base.Columns.Add(columnValue52);
			columnValue53 = new DataColumn("Value53", typeof(string), null, MappingType.Element);
			base.Columns.Add(columnValue53);
			columnValue54 = new DataColumn("Value54", typeof(string), null, MappingType.Element);
			base.Columns.Add(columnValue54);
			columnValue55 = new DataColumn("Value55", typeof(string), null, MappingType.Element);
			base.Columns.Add(columnValue55);
			columnValue56 = new DataColumn("Value56", typeof(string), null, MappingType.Element);
			base.Columns.Add(columnValue56);
			columnValue57 = new DataColumn("Value57", typeof(string), null, MappingType.Element);
			base.Columns.Add(columnValue57);
			columnValue58 = new DataColumn("Value58", typeof(string), null, MappingType.Element);
			base.Columns.Add(columnValue58);
			columnValue59 = new DataColumn("Value59", typeof(string), null, MappingType.Element);
			base.Columns.Add(columnValue59);
			columnValue60 = new DataColumn("Value60", typeof(string), null, MappingType.Element);
			base.Columns.Add(columnValue60);
			columnValue61 = new DataColumn("Value61", typeof(string), null, MappingType.Element);
			base.Columns.Add(columnValue61);
			columnValue62 = new DataColumn("Value62", typeof(string), null, MappingType.Element);
			base.Columns.Add(columnValue62);
			columnValue63 = new DataColumn("Value63", typeof(string), null, MappingType.Element);
			base.Columns.Add(columnValue63);
			columnValue64 = new DataColumn("Value64", typeof(string), null, MappingType.Element);
			base.Columns.Add(columnValue64);
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public DomainListRow NewDomainListRow()
		{
			return (DomainListRow)NewRow();
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		protected override DataRow NewRowFromBuilder(DataRowBuilder builder)
		{
			return new DomainListRow(builder);
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		protected override Type GetRowType()
		{
			return typeof(DomainListRow);
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		protected override void OnRowChanged(DataRowChangeEventArgs e)
		{
			base.OnRowChanged(e);
			if (this.DomainListRowChanged != null)
			{
				this.DomainListRowChanged(this, new DomainListRowChangeEvent((DomainListRow)e.Row, e.Action));
			}
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		protected override void OnRowChanging(DataRowChangeEventArgs e)
		{
			base.OnRowChanging(e);
			if (this.DomainListRowChanging != null)
			{
				this.DomainListRowChanging(this, new DomainListRowChangeEvent((DomainListRow)e.Row, e.Action));
			}
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		protected override void OnRowDeleted(DataRowChangeEventArgs e)
		{
			base.OnRowDeleted(e);
			if (this.DomainListRowDeleted != null)
			{
				this.DomainListRowDeleted(this, new DomainListRowChangeEvent((DomainListRow)e.Row, e.Action));
			}
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		protected override void OnRowDeleting(DataRowChangeEventArgs e)
		{
			base.OnRowDeleting(e);
			if (this.DomainListRowDeleting != null)
			{
				this.DomainListRowDeleting(this, new DomainListRowChangeEvent((DomainListRow)e.Row, e.Action));
			}
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public void RemoveDomainListRow(DomainListRow row)
		{
			base.Rows.Remove(row);
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public static XmlSchemaComplexType GetTypedTableSchema(XmlSchemaSet xs)
		{
			//IL_0000: Unknown result type (might be due to invalid IL or missing references)
			//IL_0006: Expected O, but got Unknown
			//IL_0006: Unknown result type (might be due to invalid IL or missing references)
			//IL_000c: Expected O, but got Unknown
			//IL_0012: Unknown result type (might be due to invalid IL or missing references)
			//IL_0018: Expected O, but got Unknown
			//IL_0053: Unknown result type (might be due to invalid IL or missing references)
			//IL_005a: Expected O, but got Unknown
			//IL_0089: Unknown result type (might be due to invalid IL or missing references)
			//IL_0090: Expected O, but got Unknown
			//IL_00b7: Unknown result type (might be due to invalid IL or missing references)
			//IL_00be: Expected O, but got Unknown
			//IL_013c: Unknown result type (might be due to invalid IL or missing references)
			//IL_0143: Expected O, but got Unknown
			XmlSchemaComplexType val = new XmlSchemaComplexType();
			XmlSchemaSequence val2 = new XmlSchemaSequence();
			IntelliEdit intelliEdit = new IntelliEdit();
			XmlSchemaAny val3 = new XmlSchemaAny();
			val3.Namespace = "http://www.w3.org/2001/XMLSchema";
			((XmlSchemaParticle)val3).MinOccurs = 0m;
			((XmlSchemaParticle)val3).MaxOccurs = decimal.MaxValue;
			val3.ProcessContents = (XmlSchemaContentProcessing)2;
			((XmlSchemaGroupBase)val2).Items.Add((XmlSchemaObject)(object)val3);
			XmlSchemaAny val4 = new XmlSchemaAny();
			val4.Namespace = "urn:schemas-microsoft-com:xml-diffgram-v1";
			((XmlSchemaParticle)val4).MinOccurs = 1m;
			val4.ProcessContents = (XmlSchemaContentProcessing)2;
			((XmlSchemaGroupBase)val2).Items.Add((XmlSchemaObject)(object)val4);
			XmlSchemaAttribute val5 = new XmlSchemaAttribute();
			val5.Name = "namespace";
			val5.FixedValue = intelliEdit.Namespace;
			val.Attributes.Add((XmlSchemaObject)(object)val5);
			XmlSchemaAttribute val6 = new XmlSchemaAttribute();
			val6.Name = "tableTypeName";
			val6.FixedValue = "DomainListDataTable";
			val.Attributes.Add((XmlSchemaObject)(object)val6);
			val.Particle = (XmlSchemaParticle)(object)val2;
			XmlSchema schemaSerializable = intelliEdit.GetSchemaSerializable();
			if (xs.Contains(schemaSerializable.TargetNamespace))
			{
				MemoryStream memoryStream = new MemoryStream();
				MemoryStream memoryStream2 = new MemoryStream();
				try
				{
					XmlSchema val7 = null;
					schemaSerializable.Write((Stream)memoryStream);
					IEnumerator enumerator = xs.Schemas(schemaSerializable.TargetNamespace).GetEnumerator();
					while (enumerator.MoveNext())
					{
						val7 = (XmlSchema)enumerator.Current;
						memoryStream2.SetLength(0L);
						val7.Write((Stream)memoryStream2);
						if (memoryStream.Length == memoryStream2.Length)
						{
							memoryStream.Position = 0L;
							memoryStream2.Position = 0L;
							while (memoryStream.Position != memoryStream.Length && memoryStream.ReadByte() == memoryStream2.ReadByte())
							{
							}
							if (memoryStream.Position == memoryStream.Length)
							{
								return val;
							}
						}
					}
				}
				finally
				{
					memoryStream?.Close();
					memoryStream2?.Close();
				}
			}
			xs.Add(schemaSerializable);
			return val;
		}
	}

	[Serializable]
	[XmlSchemaProvider("GetTypedTableSchema")]
	public class UseDomainDataTable : TypedTableBase<UseDomainRow>
	{
		private DataColumn columnSourceTable;

		private DataColumn columnSourceColumn;

		private DataColumn columnDomainName;

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public DataColumn SourceTableColumn => columnSourceTable;

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public DataColumn SourceColumnColumn => columnSourceColumn;

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public DataColumn DomainNameColumn => columnDomainName;

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[Browsable(false)]
		public int Count => base.Rows.Count;

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public UseDomainRow this[int index] => (UseDomainRow)base.Rows[index];

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public event UseDomainRowChangeEventHandler UseDomainRowChanging;

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public event UseDomainRowChangeEventHandler UseDomainRowChanged;

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public event UseDomainRowChangeEventHandler UseDomainRowDeleting;

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public event UseDomainRowChangeEventHandler UseDomainRowDeleted;

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public UseDomainDataTable()
		{
			base.TableName = "UseDomain";
			BeginInit();
			InitClass();
			EndInit();
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		internal UseDomainDataTable(DataTable table)
		{
			base.TableName = table.TableName;
			if (table.CaseSensitive != table.DataSet.CaseSensitive)
			{
				base.CaseSensitive = table.CaseSensitive;
			}
			if (table.Locale.ToString() != table.DataSet.Locale.ToString())
			{
				base.Locale = table.Locale;
			}
			if (table.Namespace != table.DataSet.Namespace)
			{
				base.Namespace = table.Namespace;
			}
			base.Prefix = table.Prefix;
			base.MinimumCapacity = table.MinimumCapacity;
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		protected UseDomainDataTable(SerializationInfo info, StreamingContext context)
			: base(info, context)
		{
			InitVars();
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public void AddUseDomainRow(UseDomainRow row)
		{
			base.Rows.Add(row);
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public UseDomainRow AddUseDomainRow(string SourceTable, string SourceColumn, string DomainName)
		{
			UseDomainRow useDomainRow = (UseDomainRow)NewRow();
			object[] itemArray = new object[3] { SourceTable, SourceColumn, DomainName };
			useDomainRow.ItemArray = itemArray;
			base.Rows.Add(useDomainRow);
			return useDomainRow;
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public override DataTable Clone()
		{
			UseDomainDataTable useDomainDataTable = (UseDomainDataTable)base.Clone();
			useDomainDataTable.InitVars();
			return useDomainDataTable;
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		protected override DataTable CreateInstance()
		{
			return new UseDomainDataTable();
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		internal void InitVars()
		{
			columnSourceTable = base.Columns["SourceTable"];
			columnSourceColumn = base.Columns["SourceColumn"];
			columnDomainName = base.Columns["DomainName"];
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		private void InitClass()
		{
			columnSourceTable = new DataColumn("SourceTable", typeof(string), null, MappingType.Element);
			base.Columns.Add(columnSourceTable);
			columnSourceColumn = new DataColumn("SourceColumn", typeof(string), null, MappingType.Element);
			base.Columns.Add(columnSourceColumn);
			columnDomainName = new DataColumn("DomainName", typeof(string), null, MappingType.Element);
			base.Columns.Add(columnDomainName);
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public UseDomainRow NewUseDomainRow()
		{
			return (UseDomainRow)NewRow();
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		protected override DataRow NewRowFromBuilder(DataRowBuilder builder)
		{
			return new UseDomainRow(builder);
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		protected override Type GetRowType()
		{
			return typeof(UseDomainRow);
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		protected override void OnRowChanged(DataRowChangeEventArgs e)
		{
			base.OnRowChanged(e);
			if (this.UseDomainRowChanged != null)
			{
				this.UseDomainRowChanged(this, new UseDomainRowChangeEvent((UseDomainRow)e.Row, e.Action));
			}
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		protected override void OnRowChanging(DataRowChangeEventArgs e)
		{
			base.OnRowChanging(e);
			if (this.UseDomainRowChanging != null)
			{
				this.UseDomainRowChanging(this, new UseDomainRowChangeEvent((UseDomainRow)e.Row, e.Action));
			}
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		protected override void OnRowDeleted(DataRowChangeEventArgs e)
		{
			base.OnRowDeleted(e);
			if (this.UseDomainRowDeleted != null)
			{
				this.UseDomainRowDeleted(this, new UseDomainRowChangeEvent((UseDomainRow)e.Row, e.Action));
			}
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		protected override void OnRowDeleting(DataRowChangeEventArgs e)
		{
			base.OnRowDeleting(e);
			if (this.UseDomainRowDeleting != null)
			{
				this.UseDomainRowDeleting(this, new UseDomainRowChangeEvent((UseDomainRow)e.Row, e.Action));
			}
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public void RemoveUseDomainRow(UseDomainRow row)
		{
			base.Rows.Remove(row);
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public static XmlSchemaComplexType GetTypedTableSchema(XmlSchemaSet xs)
		{
			//IL_0000: Unknown result type (might be due to invalid IL or missing references)
			//IL_0006: Expected O, but got Unknown
			//IL_0006: Unknown result type (might be due to invalid IL or missing references)
			//IL_000c: Expected O, but got Unknown
			//IL_0012: Unknown result type (might be due to invalid IL or missing references)
			//IL_0018: Expected O, but got Unknown
			//IL_0053: Unknown result type (might be due to invalid IL or missing references)
			//IL_005a: Expected O, but got Unknown
			//IL_0089: Unknown result type (might be due to invalid IL or missing references)
			//IL_0090: Expected O, but got Unknown
			//IL_00b7: Unknown result type (might be due to invalid IL or missing references)
			//IL_00be: Expected O, but got Unknown
			//IL_013c: Unknown result type (might be due to invalid IL or missing references)
			//IL_0143: Expected O, but got Unknown
			XmlSchemaComplexType val = new XmlSchemaComplexType();
			XmlSchemaSequence val2 = new XmlSchemaSequence();
			IntelliEdit intelliEdit = new IntelliEdit();
			XmlSchemaAny val3 = new XmlSchemaAny();
			val3.Namespace = "http://www.w3.org/2001/XMLSchema";
			((XmlSchemaParticle)val3).MinOccurs = 0m;
			((XmlSchemaParticle)val3).MaxOccurs = decimal.MaxValue;
			val3.ProcessContents = (XmlSchemaContentProcessing)2;
			((XmlSchemaGroupBase)val2).Items.Add((XmlSchemaObject)(object)val3);
			XmlSchemaAny val4 = new XmlSchemaAny();
			val4.Namespace = "urn:schemas-microsoft-com:xml-diffgram-v1";
			((XmlSchemaParticle)val4).MinOccurs = 1m;
			val4.ProcessContents = (XmlSchemaContentProcessing)2;
			((XmlSchemaGroupBase)val2).Items.Add((XmlSchemaObject)(object)val4);
			XmlSchemaAttribute val5 = new XmlSchemaAttribute();
			val5.Name = "namespace";
			val5.FixedValue = intelliEdit.Namespace;
			val.Attributes.Add((XmlSchemaObject)(object)val5);
			XmlSchemaAttribute val6 = new XmlSchemaAttribute();
			val6.Name = "tableTypeName";
			val6.FixedValue = "UseDomainDataTable";
			val.Attributes.Add((XmlSchemaObject)(object)val6);
			val.Particle = (XmlSchemaParticle)(object)val2;
			XmlSchema schemaSerializable = intelliEdit.GetSchemaSerializable();
			if (xs.Contains(schemaSerializable.TargetNamespace))
			{
				MemoryStream memoryStream = new MemoryStream();
				MemoryStream memoryStream2 = new MemoryStream();
				try
				{
					XmlSchema val7 = null;
					schemaSerializable.Write((Stream)memoryStream);
					IEnumerator enumerator = xs.Schemas(schemaSerializable.TargetNamespace).GetEnumerator();
					while (enumerator.MoveNext())
					{
						val7 = (XmlSchema)enumerator.Current;
						memoryStream2.SetLength(0L);
						val7.Write((Stream)memoryStream2);
						if (memoryStream.Length == memoryStream2.Length)
						{
							memoryStream.Position = 0L;
							memoryStream2.Position = 0L;
							while (memoryStream.Position != memoryStream.Length && memoryStream.ReadByte() == memoryStream2.ReadByte())
							{
							}
							if (memoryStream.Position == memoryStream.Length)
							{
								return val;
							}
						}
					}
				}
				finally
				{
					memoryStream?.Close();
					memoryStream2?.Close();
				}
			}
			xs.Add(schemaSerializable);
			return val;
		}
	}

	[Serializable]
	[XmlSchemaProvider("GetTypedTableSchema")]
	public class DoubleCrossTableDataTable : TypedTableBase<DoubleCrossTableRow>
	{
		private DataColumn columnSourceTable;

		private DataColumn columnSourceColumn;

		private DataColumn columnIntermediateTable;

		private DataColumn columnIntermediateKeyColumn;

		private DataColumn columnIntermediateJumpColumn;

		private DataColumn columnReferredTable;

		private DataColumn columnKeyColumn;

		private DataColumn columnDisplayColumn;

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public DataColumn SourceTableColumn => columnSourceTable;

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public DataColumn SourceColumnColumn => columnSourceColumn;

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public DataColumn IntermediateTableColumn => columnIntermediateTable;

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public DataColumn IntermediateKeyColumnColumn => columnIntermediateKeyColumn;

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public DataColumn IntermediateJumpColumnColumn => columnIntermediateJumpColumn;

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public DataColumn ReferredTableColumn => columnReferredTable;

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public DataColumn KeyColumnColumn => columnKeyColumn;

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public DataColumn DisplayColumnColumn => columnDisplayColumn;

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[Browsable(false)]
		public int Count => base.Rows.Count;

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public DoubleCrossTableRow this[int index] => (DoubleCrossTableRow)base.Rows[index];

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public event DoubleCrossTableRowChangeEventHandler DoubleCrossTableRowChanging;

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public event DoubleCrossTableRowChangeEventHandler DoubleCrossTableRowChanged;

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public event DoubleCrossTableRowChangeEventHandler DoubleCrossTableRowDeleting;

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public event DoubleCrossTableRowChangeEventHandler DoubleCrossTableRowDeleted;

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public DoubleCrossTableDataTable()
		{
			base.TableName = "DoubleCrossTable";
			BeginInit();
			InitClass();
			EndInit();
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		internal DoubleCrossTableDataTable(DataTable table)
		{
			base.TableName = table.TableName;
			if (table.CaseSensitive != table.DataSet.CaseSensitive)
			{
				base.CaseSensitive = table.CaseSensitive;
			}
			if (table.Locale.ToString() != table.DataSet.Locale.ToString())
			{
				base.Locale = table.Locale;
			}
			if (table.Namespace != table.DataSet.Namespace)
			{
				base.Namespace = table.Namespace;
			}
			base.Prefix = table.Prefix;
			base.MinimumCapacity = table.MinimumCapacity;
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		protected DoubleCrossTableDataTable(SerializationInfo info, StreamingContext context)
			: base(info, context)
		{
			InitVars();
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public void AddDoubleCrossTableRow(DoubleCrossTableRow row)
		{
			base.Rows.Add(row);
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public DoubleCrossTableRow AddDoubleCrossTableRow(string SourceTable, string SourceColumn, string IntermediateTable, string IntermediateKeyColumn, string IntermediateJumpColumn, string ReferredTable, string KeyColumn, string DisplayColumn)
		{
			DoubleCrossTableRow doubleCrossTableRow = (DoubleCrossTableRow)NewRow();
			object[] itemArray = new object[8] { SourceTable, SourceColumn, IntermediateTable, IntermediateKeyColumn, IntermediateJumpColumn, ReferredTable, KeyColumn, DisplayColumn };
			doubleCrossTableRow.ItemArray = itemArray;
			base.Rows.Add(doubleCrossTableRow);
			return doubleCrossTableRow;
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public override DataTable Clone()
		{
			DoubleCrossTableDataTable doubleCrossTableDataTable = (DoubleCrossTableDataTable)base.Clone();
			doubleCrossTableDataTable.InitVars();
			return doubleCrossTableDataTable;
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		protected override DataTable CreateInstance()
		{
			return new DoubleCrossTableDataTable();
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		internal void InitVars()
		{
			columnSourceTable = base.Columns["SourceTable"];
			columnSourceColumn = base.Columns["SourceColumn"];
			columnIntermediateTable = base.Columns["IntermediateTable"];
			columnIntermediateKeyColumn = base.Columns["IntermediateKeyColumn"];
			columnIntermediateJumpColumn = base.Columns["IntermediateJumpColumn"];
			columnReferredTable = base.Columns["ReferredTable"];
			columnKeyColumn = base.Columns["KeyColumn"];
			columnDisplayColumn = base.Columns["DisplayColumn"];
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		private void InitClass()
		{
			columnSourceTable = new DataColumn("SourceTable", typeof(string), null, MappingType.Element);
			base.Columns.Add(columnSourceTable);
			columnSourceColumn = new DataColumn("SourceColumn", typeof(string), null, MappingType.Element);
			base.Columns.Add(columnSourceColumn);
			columnIntermediateTable = new DataColumn("IntermediateTable", typeof(string), null, MappingType.Element);
			base.Columns.Add(columnIntermediateTable);
			columnIntermediateKeyColumn = new DataColumn("IntermediateKeyColumn", typeof(string), null, MappingType.Element);
			base.Columns.Add(columnIntermediateKeyColumn);
			columnIntermediateJumpColumn = new DataColumn("IntermediateJumpColumn", typeof(string), null, MappingType.Element);
			base.Columns.Add(columnIntermediateJumpColumn);
			columnReferredTable = new DataColumn("ReferredTable", typeof(string), null, MappingType.Element);
			base.Columns.Add(columnReferredTable);
			columnKeyColumn = new DataColumn("KeyColumn", typeof(string), null, MappingType.Element);
			base.Columns.Add(columnKeyColumn);
			columnDisplayColumn = new DataColumn("DisplayColumn", typeof(string), null, MappingType.Element);
			base.Columns.Add(columnDisplayColumn);
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public DoubleCrossTableRow NewDoubleCrossTableRow()
		{
			return (DoubleCrossTableRow)NewRow();
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		protected override DataRow NewRowFromBuilder(DataRowBuilder builder)
		{
			return new DoubleCrossTableRow(builder);
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		protected override Type GetRowType()
		{
			return typeof(DoubleCrossTableRow);
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		protected override void OnRowChanged(DataRowChangeEventArgs e)
		{
			base.OnRowChanged(e);
			if (this.DoubleCrossTableRowChanged != null)
			{
				this.DoubleCrossTableRowChanged(this, new DoubleCrossTableRowChangeEvent((DoubleCrossTableRow)e.Row, e.Action));
			}
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		protected override void OnRowChanging(DataRowChangeEventArgs e)
		{
			base.OnRowChanging(e);
			if (this.DoubleCrossTableRowChanging != null)
			{
				this.DoubleCrossTableRowChanging(this, new DoubleCrossTableRowChangeEvent((DoubleCrossTableRow)e.Row, e.Action));
			}
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		protected override void OnRowDeleted(DataRowChangeEventArgs e)
		{
			base.OnRowDeleted(e);
			if (this.DoubleCrossTableRowDeleted != null)
			{
				this.DoubleCrossTableRowDeleted(this, new DoubleCrossTableRowChangeEvent((DoubleCrossTableRow)e.Row, e.Action));
			}
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		protected override void OnRowDeleting(DataRowChangeEventArgs e)
		{
			base.OnRowDeleting(e);
			if (this.DoubleCrossTableRowDeleting != null)
			{
				this.DoubleCrossTableRowDeleting(this, new DoubleCrossTableRowChangeEvent((DoubleCrossTableRow)e.Row, e.Action));
			}
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public void RemoveDoubleCrossTableRow(DoubleCrossTableRow row)
		{
			base.Rows.Remove(row);
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public static XmlSchemaComplexType GetTypedTableSchema(XmlSchemaSet xs)
		{
			//IL_0000: Unknown result type (might be due to invalid IL or missing references)
			//IL_0006: Expected O, but got Unknown
			//IL_0006: Unknown result type (might be due to invalid IL or missing references)
			//IL_000c: Expected O, but got Unknown
			//IL_0012: Unknown result type (might be due to invalid IL or missing references)
			//IL_0018: Expected O, but got Unknown
			//IL_0053: Unknown result type (might be due to invalid IL or missing references)
			//IL_005a: Expected O, but got Unknown
			//IL_0089: Unknown result type (might be due to invalid IL or missing references)
			//IL_0090: Expected O, but got Unknown
			//IL_00b7: Unknown result type (might be due to invalid IL or missing references)
			//IL_00be: Expected O, but got Unknown
			//IL_013c: Unknown result type (might be due to invalid IL or missing references)
			//IL_0143: Expected O, but got Unknown
			XmlSchemaComplexType val = new XmlSchemaComplexType();
			XmlSchemaSequence val2 = new XmlSchemaSequence();
			IntelliEdit intelliEdit = new IntelliEdit();
			XmlSchemaAny val3 = new XmlSchemaAny();
			val3.Namespace = "http://www.w3.org/2001/XMLSchema";
			((XmlSchemaParticle)val3).MinOccurs = 0m;
			((XmlSchemaParticle)val3).MaxOccurs = decimal.MaxValue;
			val3.ProcessContents = (XmlSchemaContentProcessing)2;
			((XmlSchemaGroupBase)val2).Items.Add((XmlSchemaObject)(object)val3);
			XmlSchemaAny val4 = new XmlSchemaAny();
			val4.Namespace = "urn:schemas-microsoft-com:xml-diffgram-v1";
			((XmlSchemaParticle)val4).MinOccurs = 1m;
			val4.ProcessContents = (XmlSchemaContentProcessing)2;
			((XmlSchemaGroupBase)val2).Items.Add((XmlSchemaObject)(object)val4);
			XmlSchemaAttribute val5 = new XmlSchemaAttribute();
			val5.Name = "namespace";
			val5.FixedValue = intelliEdit.Namespace;
			val.Attributes.Add((XmlSchemaObject)(object)val5);
			XmlSchemaAttribute val6 = new XmlSchemaAttribute();
			val6.Name = "tableTypeName";
			val6.FixedValue = "DoubleCrossTableDataTable";
			val.Attributes.Add((XmlSchemaObject)(object)val6);
			val.Particle = (XmlSchemaParticle)(object)val2;
			XmlSchema schemaSerializable = intelliEdit.GetSchemaSerializable();
			if (xs.Contains(schemaSerializable.TargetNamespace))
			{
				MemoryStream memoryStream = new MemoryStream();
				MemoryStream memoryStream2 = new MemoryStream();
				try
				{
					XmlSchema val7 = null;
					schemaSerializable.Write((Stream)memoryStream);
					IEnumerator enumerator = xs.Schemas(schemaSerializable.TargetNamespace).GetEnumerator();
					while (enumerator.MoveNext())
					{
						val7 = (XmlSchema)enumerator.Current;
						memoryStream2.SetLength(0L);
						val7.Write((Stream)memoryStream2);
						if (memoryStream.Length == memoryStream2.Length)
						{
							memoryStream.Position = 0L;
							memoryStream2.Position = 0L;
							while (memoryStream.Position != memoryStream.Length && memoryStream.ReadByte() == memoryStream2.ReadByte())
							{
							}
							if (memoryStream.Position == memoryStream.Length)
							{
								return val;
							}
						}
					}
				}
				finally
				{
					memoryStream?.Close();
					memoryStream2?.Close();
				}
			}
			xs.Add(schemaSerializable);
			return val;
		}
	}

	public class CrossTableRow : DataRow
	{
		private CrossTableDataTable tableCrossTable;

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public string SourceTable
		{
			get
			{
				try
				{
					return (string)base[tableCrossTable.SourceTableColumn];
				}
				catch (InvalidCastException innerException)
				{
					throw new StrongTypingException("The value for column 'SourceTable' in table 'CrossTable' is DBNull.", innerException);
				}
			}
			set
			{
				base[tableCrossTable.SourceTableColumn] = value;
			}
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public string SourceColumn
		{
			get
			{
				try
				{
					return (string)base[tableCrossTable.SourceColumnColumn];
				}
				catch (InvalidCastException innerException)
				{
					throw new StrongTypingException("The value for column 'SourceColumn' in table 'CrossTable' is DBNull.", innerException);
				}
			}
			set
			{
				base[tableCrossTable.SourceColumnColumn] = value;
			}
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public string ReferredTable
		{
			get
			{
				try
				{
					return (string)base[tableCrossTable.ReferredTableColumn];
				}
				catch (InvalidCastException innerException)
				{
					throw new StrongTypingException("The value for column 'ReferredTable' in table 'CrossTable' is DBNull.", innerException);
				}
			}
			set
			{
				base[tableCrossTable.ReferredTableColumn] = value;
			}
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public string KeyColumn
		{
			get
			{
				try
				{
					return (string)base[tableCrossTable.KeyColumnColumn];
				}
				catch (InvalidCastException innerException)
				{
					throw new StrongTypingException("The value for column 'KeyColumn' in table 'CrossTable' is DBNull.", innerException);
				}
			}
			set
			{
				base[tableCrossTable.KeyColumnColumn] = value;
			}
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public string DisplayColumn
		{
			get
			{
				try
				{
					return (string)base[tableCrossTable.DisplayColumnColumn];
				}
				catch (InvalidCastException innerException)
				{
					throw new StrongTypingException("The value for column 'DisplayColumn' in table 'CrossTable' is DBNull.", innerException);
				}
			}
			set
			{
				base[tableCrossTable.DisplayColumnColumn] = value;
			}
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		internal CrossTableRow(DataRowBuilder rb)
			: base(rb)
		{
			tableCrossTable = (CrossTableDataTable)base.Table;
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public bool IsSourceTableNull()
		{
			return IsNull(tableCrossTable.SourceTableColumn);
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public void SetSourceTableNull()
		{
			base[tableCrossTable.SourceTableColumn] = Convert.DBNull;
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public bool IsSourceColumnNull()
		{
			return IsNull(tableCrossTable.SourceColumnColumn);
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public void SetSourceColumnNull()
		{
			base[tableCrossTable.SourceColumnColumn] = Convert.DBNull;
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public bool IsReferredTableNull()
		{
			return IsNull(tableCrossTable.ReferredTableColumn);
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public void SetReferredTableNull()
		{
			base[tableCrossTable.ReferredTableColumn] = Convert.DBNull;
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public bool IsKeyColumnNull()
		{
			return IsNull(tableCrossTable.KeyColumnColumn);
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public void SetKeyColumnNull()
		{
			base[tableCrossTable.KeyColumnColumn] = Convert.DBNull;
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public bool IsDisplayColumnNull()
		{
			return IsNull(tableCrossTable.DisplayColumnColumn);
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public void SetDisplayColumnNull()
		{
			base[tableCrossTable.DisplayColumnColumn] = Convert.DBNull;
		}
	}

	public class DomainListRow : DataRow
	{
		private DomainListDataTable tableDomainList;

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public string Name
		{
			get
			{
				try
				{
					return (string)base[tableDomainList.NameColumn];
				}
				catch (InvalidCastException innerException)
				{
					throw new StrongTypingException("The value for column 'Name' in table 'DomainList' is DBNull.", innerException);
				}
			}
			set
			{
				base[tableDomainList.NameColumn] = value;
			}
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public int TotalValues
		{
			get
			{
				try
				{
					return (int)base[tableDomainList.TotalValuesColumn];
				}
				catch (InvalidCastException innerException)
				{
					throw new StrongTypingException("The value for column 'TotalValues' in table 'DomainList' is DBNull.", innerException);
				}
			}
			set
			{
				base[tableDomainList.TotalValuesColumn] = value;
			}
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public string Value0
		{
			get
			{
				try
				{
					return (string)base[tableDomainList.Value0Column];
				}
				catch (InvalidCastException innerException)
				{
					throw new StrongTypingException("The value for column 'Value0' in table 'DomainList' is DBNull.", innerException);
				}
			}
			set
			{
				base[tableDomainList.Value0Column] = value;
			}
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public string Value1
		{
			get
			{
				try
				{
					return (string)base[tableDomainList.Value1Column];
				}
				catch (InvalidCastException innerException)
				{
					throw new StrongTypingException("The value for column 'Value1' in table 'DomainList' is DBNull.", innerException);
				}
			}
			set
			{
				base[tableDomainList.Value1Column] = value;
			}
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public string Value2
		{
			get
			{
				try
				{
					return (string)base[tableDomainList.Value2Column];
				}
				catch (InvalidCastException innerException)
				{
					throw new StrongTypingException("The value for column 'Value2' in table 'DomainList' is DBNull.", innerException);
				}
			}
			set
			{
				base[tableDomainList.Value2Column] = value;
			}
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public string Value3
		{
			get
			{
				try
				{
					return (string)base[tableDomainList.Value3Column];
				}
				catch (InvalidCastException innerException)
				{
					throw new StrongTypingException("The value for column 'Value3' in table 'DomainList' is DBNull.", innerException);
				}
			}
			set
			{
				base[tableDomainList.Value3Column] = value;
			}
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public string Value4
		{
			get
			{
				try
				{
					return (string)base[tableDomainList.Value4Column];
				}
				catch (InvalidCastException innerException)
				{
					throw new StrongTypingException("The value for column 'Value4' in table 'DomainList' is DBNull.", innerException);
				}
			}
			set
			{
				base[tableDomainList.Value4Column] = value;
			}
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public string Value5
		{
			get
			{
				try
				{
					return (string)base[tableDomainList.Value5Column];
				}
				catch (InvalidCastException innerException)
				{
					throw new StrongTypingException("The value for column 'Value5' in table 'DomainList' is DBNull.", innerException);
				}
			}
			set
			{
				base[tableDomainList.Value5Column] = value;
			}
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public string Value6
		{
			get
			{
				try
				{
					return (string)base[tableDomainList.Value6Column];
				}
				catch (InvalidCastException innerException)
				{
					throw new StrongTypingException("The value for column 'Value6' in table 'DomainList' is DBNull.", innerException);
				}
			}
			set
			{
				base[tableDomainList.Value6Column] = value;
			}
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public string Value7
		{
			get
			{
				try
				{
					return (string)base[tableDomainList.Value7Column];
				}
				catch (InvalidCastException innerException)
				{
					throw new StrongTypingException("The value for column 'Value7' in table 'DomainList' is DBNull.", innerException);
				}
			}
			set
			{
				base[tableDomainList.Value7Column] = value;
			}
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public string Value8
		{
			get
			{
				try
				{
					return (string)base[tableDomainList.Value8Column];
				}
				catch (InvalidCastException innerException)
				{
					throw new StrongTypingException("The value for column 'Value8' in table 'DomainList' is DBNull.", innerException);
				}
			}
			set
			{
				base[tableDomainList.Value8Column] = value;
			}
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public string Value9
		{
			get
			{
				try
				{
					return (string)base[tableDomainList.Value9Column];
				}
				catch (InvalidCastException innerException)
				{
					throw new StrongTypingException("The value for column 'Value9' in table 'DomainList' is DBNull.", innerException);
				}
			}
			set
			{
				base[tableDomainList.Value9Column] = value;
			}
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public string Value10
		{
			get
			{
				try
				{
					return (string)base[tableDomainList.Value10Column];
				}
				catch (InvalidCastException innerException)
				{
					throw new StrongTypingException("The value for column 'Value10' in table 'DomainList' is DBNull.", innerException);
				}
			}
			set
			{
				base[tableDomainList.Value10Column] = value;
			}
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public string Value11
		{
			get
			{
				try
				{
					return (string)base[tableDomainList.Value11Column];
				}
				catch (InvalidCastException innerException)
				{
					throw new StrongTypingException("The value for column 'Value11' in table 'DomainList' is DBNull.", innerException);
				}
			}
			set
			{
				base[tableDomainList.Value11Column] = value;
			}
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public string Value12
		{
			get
			{
				try
				{
					return (string)base[tableDomainList.Value12Column];
				}
				catch (InvalidCastException innerException)
				{
					throw new StrongTypingException("The value for column 'Value12' in table 'DomainList' is DBNull.", innerException);
				}
			}
			set
			{
				base[tableDomainList.Value12Column] = value;
			}
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public string Value13
		{
			get
			{
				try
				{
					return (string)base[tableDomainList.Value13Column];
				}
				catch (InvalidCastException innerException)
				{
					throw new StrongTypingException("The value for column 'Value13' in table 'DomainList' is DBNull.", innerException);
				}
			}
			set
			{
				base[tableDomainList.Value13Column] = value;
			}
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public string Value14
		{
			get
			{
				try
				{
					return (string)base[tableDomainList.Value14Column];
				}
				catch (InvalidCastException innerException)
				{
					throw new StrongTypingException("The value for column 'Value14' in table 'DomainList' is DBNull.", innerException);
				}
			}
			set
			{
				base[tableDomainList.Value14Column] = value;
			}
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public string Value15
		{
			get
			{
				try
				{
					return (string)base[tableDomainList.Value15Column];
				}
				catch (InvalidCastException innerException)
				{
					throw new StrongTypingException("The value for column 'Value15' in table 'DomainList' is DBNull.", innerException);
				}
			}
			set
			{
				base[tableDomainList.Value15Column] = value;
			}
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public string Value16
		{
			get
			{
				try
				{
					return (string)base[tableDomainList.Value16Column];
				}
				catch (InvalidCastException innerException)
				{
					throw new StrongTypingException("The value for column 'Value16' in table 'DomainList' is DBNull.", innerException);
				}
			}
			set
			{
				base[tableDomainList.Value16Column] = value;
			}
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public string Value17
		{
			get
			{
				try
				{
					return (string)base[tableDomainList.Value17Column];
				}
				catch (InvalidCastException innerException)
				{
					throw new StrongTypingException("The value for column 'Value17' in table 'DomainList' is DBNull.", innerException);
				}
			}
			set
			{
				base[tableDomainList.Value17Column] = value;
			}
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public string Value18
		{
			get
			{
				try
				{
					return (string)base[tableDomainList.Value18Column];
				}
				catch (InvalidCastException innerException)
				{
					throw new StrongTypingException("The value for column 'Value18' in table 'DomainList' is DBNull.", innerException);
				}
			}
			set
			{
				base[tableDomainList.Value18Column] = value;
			}
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public string Value19
		{
			get
			{
				try
				{
					return (string)base[tableDomainList.Value19Column];
				}
				catch (InvalidCastException innerException)
				{
					throw new StrongTypingException("The value for column 'Value19' in table 'DomainList' is DBNull.", innerException);
				}
			}
			set
			{
				base[tableDomainList.Value19Column] = value;
			}
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public string Value20
		{
			get
			{
				try
				{
					return (string)base[tableDomainList.Value20Column];
				}
				catch (InvalidCastException innerException)
				{
					throw new StrongTypingException("The value for column 'Value20' in table 'DomainList' is DBNull.", innerException);
				}
			}
			set
			{
				base[tableDomainList.Value20Column] = value;
			}
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public string Value21
		{
			get
			{
				try
				{
					return (string)base[tableDomainList.Value21Column];
				}
				catch (InvalidCastException innerException)
				{
					throw new StrongTypingException("The value for column 'Value21' in table 'DomainList' is DBNull.", innerException);
				}
			}
			set
			{
				base[tableDomainList.Value21Column] = value;
			}
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public string Value22
		{
			get
			{
				try
				{
					return (string)base[tableDomainList.Value22Column];
				}
				catch (InvalidCastException innerException)
				{
					throw new StrongTypingException("The value for column 'Value22' in table 'DomainList' is DBNull.", innerException);
				}
			}
			set
			{
				base[tableDomainList.Value22Column] = value;
			}
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public string Value23
		{
			get
			{
				try
				{
					return (string)base[tableDomainList.Value23Column];
				}
				catch (InvalidCastException innerException)
				{
					throw new StrongTypingException("The value for column 'Value23' in table 'DomainList' is DBNull.", innerException);
				}
			}
			set
			{
				base[tableDomainList.Value23Column] = value;
			}
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public string Value24
		{
			get
			{
				try
				{
					return (string)base[tableDomainList.Value24Column];
				}
				catch (InvalidCastException innerException)
				{
					throw new StrongTypingException("The value for column 'Value24' in table 'DomainList' is DBNull.", innerException);
				}
			}
			set
			{
				base[tableDomainList.Value24Column] = value;
			}
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public string Value25
		{
			get
			{
				try
				{
					return (string)base[tableDomainList.Value25Column];
				}
				catch (InvalidCastException innerException)
				{
					throw new StrongTypingException("The value for column 'Value25' in table 'DomainList' is DBNull.", innerException);
				}
			}
			set
			{
				base[tableDomainList.Value25Column] = value;
			}
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public string Value26
		{
			get
			{
				try
				{
					return (string)base[tableDomainList.Value26Column];
				}
				catch (InvalidCastException innerException)
				{
					throw new StrongTypingException("The value for column 'Value26' in table 'DomainList' is DBNull.", innerException);
				}
			}
			set
			{
				base[tableDomainList.Value26Column] = value;
			}
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public string Value27
		{
			get
			{
				try
				{
					return (string)base[tableDomainList.Value27Column];
				}
				catch (InvalidCastException innerException)
				{
					throw new StrongTypingException("The value for column 'Value27' in table 'DomainList' is DBNull.", innerException);
				}
			}
			set
			{
				base[tableDomainList.Value27Column] = value;
			}
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public string Value28
		{
			get
			{
				try
				{
					return (string)base[tableDomainList.Value28Column];
				}
				catch (InvalidCastException innerException)
				{
					throw new StrongTypingException("The value for column 'Value28' in table 'DomainList' is DBNull.", innerException);
				}
			}
			set
			{
				base[tableDomainList.Value28Column] = value;
			}
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public string Value29
		{
			get
			{
				try
				{
					return (string)base[tableDomainList.Value29Column];
				}
				catch (InvalidCastException innerException)
				{
					throw new StrongTypingException("The value for column 'Value29' in table 'DomainList' is DBNull.", innerException);
				}
			}
			set
			{
				base[tableDomainList.Value29Column] = value;
			}
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public string Value30
		{
			get
			{
				try
				{
					return (string)base[tableDomainList.Value30Column];
				}
				catch (InvalidCastException innerException)
				{
					throw new StrongTypingException("The value for column 'Value30' in table 'DomainList' is DBNull.", innerException);
				}
			}
			set
			{
				base[tableDomainList.Value30Column] = value;
			}
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public string Value31
		{
			get
			{
				try
				{
					return (string)base[tableDomainList.Value31Column];
				}
				catch (InvalidCastException innerException)
				{
					throw new StrongTypingException("The value for column 'Value31' in table 'DomainList' is DBNull.", innerException);
				}
			}
			set
			{
				base[tableDomainList.Value31Column] = value;
			}
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public string Value32
		{
			get
			{
				try
				{
					return (string)base[tableDomainList.Value32Column];
				}
				catch (InvalidCastException innerException)
				{
					throw new StrongTypingException("The value for column 'Value32' in table 'DomainList' is DBNull.", innerException);
				}
			}
			set
			{
				base[tableDomainList.Value32Column] = value;
			}
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public string Value33
		{
			get
			{
				try
				{
					return (string)base[tableDomainList.Value33Column];
				}
				catch (InvalidCastException innerException)
				{
					throw new StrongTypingException("The value for column 'Value33' in table 'DomainList' is DBNull.", innerException);
				}
			}
			set
			{
				base[tableDomainList.Value33Column] = value;
			}
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public string Value34
		{
			get
			{
				try
				{
					return (string)base[tableDomainList.Value34Column];
				}
				catch (InvalidCastException innerException)
				{
					throw new StrongTypingException("The value for column 'Value34' in table 'DomainList' is DBNull.", innerException);
				}
			}
			set
			{
				base[tableDomainList.Value34Column] = value;
			}
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public string Value35
		{
			get
			{
				try
				{
					return (string)base[tableDomainList.Value35Column];
				}
				catch (InvalidCastException innerException)
				{
					throw new StrongTypingException("The value for column 'Value35' in table 'DomainList' is DBNull.", innerException);
				}
			}
			set
			{
				base[tableDomainList.Value35Column] = value;
			}
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public string Value36
		{
			get
			{
				try
				{
					return (string)base[tableDomainList.Value36Column];
				}
				catch (InvalidCastException innerException)
				{
					throw new StrongTypingException("The value for column 'Value36' in table 'DomainList' is DBNull.", innerException);
				}
			}
			set
			{
				base[tableDomainList.Value36Column] = value;
			}
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public string Value37
		{
			get
			{
				try
				{
					return (string)base[tableDomainList.Value37Column];
				}
				catch (InvalidCastException innerException)
				{
					throw new StrongTypingException("The value for column 'Value37' in table 'DomainList' is DBNull.", innerException);
				}
			}
			set
			{
				base[tableDomainList.Value37Column] = value;
			}
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public string Value38
		{
			get
			{
				try
				{
					return (string)base[tableDomainList.Value38Column];
				}
				catch (InvalidCastException innerException)
				{
					throw new StrongTypingException("The value for column 'Value38' in table 'DomainList' is DBNull.", innerException);
				}
			}
			set
			{
				base[tableDomainList.Value38Column] = value;
			}
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public string Value39
		{
			get
			{
				try
				{
					return (string)base[tableDomainList.Value39Column];
				}
				catch (InvalidCastException innerException)
				{
					throw new StrongTypingException("The value for column 'Value39' in table 'DomainList' is DBNull.", innerException);
				}
			}
			set
			{
				base[tableDomainList.Value39Column] = value;
			}
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public string Value40
		{
			get
			{
				try
				{
					return (string)base[tableDomainList.Value40Column];
				}
				catch (InvalidCastException innerException)
				{
					throw new StrongTypingException("The value for column 'Value40' in table 'DomainList' is DBNull.", innerException);
				}
			}
			set
			{
				base[tableDomainList.Value40Column] = value;
			}
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public string Value41
		{
			get
			{
				try
				{
					return (string)base[tableDomainList.Value41Column];
				}
				catch (InvalidCastException innerException)
				{
					throw new StrongTypingException("The value for column 'Value41' in table 'DomainList' is DBNull.", innerException);
				}
			}
			set
			{
				base[tableDomainList.Value41Column] = value;
			}
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public string Value42
		{
			get
			{
				try
				{
					return (string)base[tableDomainList.Value42Column];
				}
				catch (InvalidCastException innerException)
				{
					throw new StrongTypingException("The value for column 'Value42' in table 'DomainList' is DBNull.", innerException);
				}
			}
			set
			{
				base[tableDomainList.Value42Column] = value;
			}
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public string Value43
		{
			get
			{
				try
				{
					return (string)base[tableDomainList.Value43Column];
				}
				catch (InvalidCastException innerException)
				{
					throw new StrongTypingException("The value for column 'Value43' in table 'DomainList' is DBNull.", innerException);
				}
			}
			set
			{
				base[tableDomainList.Value43Column] = value;
			}
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public string Value44
		{
			get
			{
				try
				{
					return (string)base[tableDomainList.Value44Column];
				}
				catch (InvalidCastException innerException)
				{
					throw new StrongTypingException("The value for column 'Value44' in table 'DomainList' is DBNull.", innerException);
				}
			}
			set
			{
				base[tableDomainList.Value44Column] = value;
			}
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public string Value45
		{
			get
			{
				try
				{
					return (string)base[tableDomainList.Value45Column];
				}
				catch (InvalidCastException innerException)
				{
					throw new StrongTypingException("The value for column 'Value45' in table 'DomainList' is DBNull.", innerException);
				}
			}
			set
			{
				base[tableDomainList.Value45Column] = value;
			}
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public string Value46
		{
			get
			{
				try
				{
					return (string)base[tableDomainList.Value46Column];
				}
				catch (InvalidCastException innerException)
				{
					throw new StrongTypingException("The value for column 'Value46' in table 'DomainList' is DBNull.", innerException);
				}
			}
			set
			{
				base[tableDomainList.Value46Column] = value;
			}
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public string Value47
		{
			get
			{
				try
				{
					return (string)base[tableDomainList.Value47Column];
				}
				catch (InvalidCastException innerException)
				{
					throw new StrongTypingException("The value for column 'Value47' in table 'DomainList' is DBNull.", innerException);
				}
			}
			set
			{
				base[tableDomainList.Value47Column] = value;
			}
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public string Value48
		{
			get
			{
				try
				{
					return (string)base[tableDomainList.Value48Column];
				}
				catch (InvalidCastException innerException)
				{
					throw new StrongTypingException("The value for column 'Value48' in table 'DomainList' is DBNull.", innerException);
				}
			}
			set
			{
				base[tableDomainList.Value48Column] = value;
			}
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public string Value49
		{
			get
			{
				try
				{
					return (string)base[tableDomainList.Value49Column];
				}
				catch (InvalidCastException innerException)
				{
					throw new StrongTypingException("The value for column 'Value49' in table 'DomainList' is DBNull.", innerException);
				}
			}
			set
			{
				base[tableDomainList.Value49Column] = value;
			}
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public string Value50
		{
			get
			{
				try
				{
					return (string)base[tableDomainList.Value50Column];
				}
				catch (InvalidCastException innerException)
				{
					throw new StrongTypingException("The value for column 'Value50' in table 'DomainList' is DBNull.", innerException);
				}
			}
			set
			{
				base[tableDomainList.Value50Column] = value;
			}
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public string Value51
		{
			get
			{
				try
				{
					return (string)base[tableDomainList.Value51Column];
				}
				catch (InvalidCastException innerException)
				{
					throw new StrongTypingException("The value for column 'Value51' in table 'DomainList' is DBNull.", innerException);
				}
			}
			set
			{
				base[tableDomainList.Value51Column] = value;
			}
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public string Value52
		{
			get
			{
				try
				{
					return (string)base[tableDomainList.Value52Column];
				}
				catch (InvalidCastException innerException)
				{
					throw new StrongTypingException("The value for column 'Value52' in table 'DomainList' is DBNull.", innerException);
				}
			}
			set
			{
				base[tableDomainList.Value52Column] = value;
			}
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public string Value53
		{
			get
			{
				try
				{
					return (string)base[tableDomainList.Value53Column];
				}
				catch (InvalidCastException innerException)
				{
					throw new StrongTypingException("The value for column 'Value53' in table 'DomainList' is DBNull.", innerException);
				}
			}
			set
			{
				base[tableDomainList.Value53Column] = value;
			}
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public string Value54
		{
			get
			{
				try
				{
					return (string)base[tableDomainList.Value54Column];
				}
				catch (InvalidCastException innerException)
				{
					throw new StrongTypingException("The value for column 'Value54' in table 'DomainList' is DBNull.", innerException);
				}
			}
			set
			{
				base[tableDomainList.Value54Column] = value;
			}
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public string Value55
		{
			get
			{
				try
				{
					return (string)base[tableDomainList.Value55Column];
				}
				catch (InvalidCastException innerException)
				{
					throw new StrongTypingException("The value for column 'Value55' in table 'DomainList' is DBNull.", innerException);
				}
			}
			set
			{
				base[tableDomainList.Value55Column] = value;
			}
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public string Value56
		{
			get
			{
				try
				{
					return (string)base[tableDomainList.Value56Column];
				}
				catch (InvalidCastException innerException)
				{
					throw new StrongTypingException("The value for column 'Value56' in table 'DomainList' is DBNull.", innerException);
				}
			}
			set
			{
				base[tableDomainList.Value56Column] = value;
			}
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public string Value57
		{
			get
			{
				try
				{
					return (string)base[tableDomainList.Value57Column];
				}
				catch (InvalidCastException innerException)
				{
					throw new StrongTypingException("The value for column 'Value57' in table 'DomainList' is DBNull.", innerException);
				}
			}
			set
			{
				base[tableDomainList.Value57Column] = value;
			}
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public string Value58
		{
			get
			{
				try
				{
					return (string)base[tableDomainList.Value58Column];
				}
				catch (InvalidCastException innerException)
				{
					throw new StrongTypingException("The value for column 'Value58' in table 'DomainList' is DBNull.", innerException);
				}
			}
			set
			{
				base[tableDomainList.Value58Column] = value;
			}
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public string Value59
		{
			get
			{
				try
				{
					return (string)base[tableDomainList.Value59Column];
				}
				catch (InvalidCastException innerException)
				{
					throw new StrongTypingException("The value for column 'Value59' in table 'DomainList' is DBNull.", innerException);
				}
			}
			set
			{
				base[tableDomainList.Value59Column] = value;
			}
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public string Value60
		{
			get
			{
				try
				{
					return (string)base[tableDomainList.Value60Column];
				}
				catch (InvalidCastException innerException)
				{
					throw new StrongTypingException("The value for column 'Value60' in table 'DomainList' is DBNull.", innerException);
				}
			}
			set
			{
				base[tableDomainList.Value60Column] = value;
			}
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public string Value61
		{
			get
			{
				try
				{
					return (string)base[tableDomainList.Value61Column];
				}
				catch (InvalidCastException innerException)
				{
					throw new StrongTypingException("The value for column 'Value61' in table 'DomainList' is DBNull.", innerException);
				}
			}
			set
			{
				base[tableDomainList.Value61Column] = value;
			}
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public string Value62
		{
			get
			{
				try
				{
					return (string)base[tableDomainList.Value62Column];
				}
				catch (InvalidCastException innerException)
				{
					throw new StrongTypingException("The value for column 'Value62' in table 'DomainList' is DBNull.", innerException);
				}
			}
			set
			{
				base[tableDomainList.Value62Column] = value;
			}
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public string Value63
		{
			get
			{
				try
				{
					return (string)base[tableDomainList.Value63Column];
				}
				catch (InvalidCastException innerException)
				{
					throw new StrongTypingException("The value for column 'Value63' in table 'DomainList' is DBNull.", innerException);
				}
			}
			set
			{
				base[tableDomainList.Value63Column] = value;
			}
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public string Value64
		{
			get
			{
				try
				{
					return (string)base[tableDomainList.Value64Column];
				}
				catch (InvalidCastException innerException)
				{
					throw new StrongTypingException("The value for column 'Value64' in table 'DomainList' is DBNull.", innerException);
				}
			}
			set
			{
				base[tableDomainList.Value64Column] = value;
			}
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		internal DomainListRow(DataRowBuilder rb)
			: base(rb)
		{
			tableDomainList = (DomainListDataTable)base.Table;
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public bool IsNameNull()
		{
			return IsNull(tableDomainList.NameColumn);
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public void SetNameNull()
		{
			base[tableDomainList.NameColumn] = Convert.DBNull;
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public bool IsTotalValuesNull()
		{
			return IsNull(tableDomainList.TotalValuesColumn);
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public void SetTotalValuesNull()
		{
			base[tableDomainList.TotalValuesColumn] = Convert.DBNull;
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public bool IsValue0Null()
		{
			return IsNull(tableDomainList.Value0Column);
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public void SetValue0Null()
		{
			base[tableDomainList.Value0Column] = Convert.DBNull;
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public bool IsValue1Null()
		{
			return IsNull(tableDomainList.Value1Column);
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public void SetValue1Null()
		{
			base[tableDomainList.Value1Column] = Convert.DBNull;
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public bool IsValue2Null()
		{
			return IsNull(tableDomainList.Value2Column);
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public void SetValue2Null()
		{
			base[tableDomainList.Value2Column] = Convert.DBNull;
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public bool IsValue3Null()
		{
			return IsNull(tableDomainList.Value3Column);
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public void SetValue3Null()
		{
			base[tableDomainList.Value3Column] = Convert.DBNull;
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public bool IsValue4Null()
		{
			return IsNull(tableDomainList.Value4Column);
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public void SetValue4Null()
		{
			base[tableDomainList.Value4Column] = Convert.DBNull;
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public bool IsValue5Null()
		{
			return IsNull(tableDomainList.Value5Column);
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public void SetValue5Null()
		{
			base[tableDomainList.Value5Column] = Convert.DBNull;
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public bool IsValue6Null()
		{
			return IsNull(tableDomainList.Value6Column);
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public void SetValue6Null()
		{
			base[tableDomainList.Value6Column] = Convert.DBNull;
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public bool IsValue7Null()
		{
			return IsNull(tableDomainList.Value7Column);
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public void SetValue7Null()
		{
			base[tableDomainList.Value7Column] = Convert.DBNull;
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public bool IsValue8Null()
		{
			return IsNull(tableDomainList.Value8Column);
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public void SetValue8Null()
		{
			base[tableDomainList.Value8Column] = Convert.DBNull;
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public bool IsValue9Null()
		{
			return IsNull(tableDomainList.Value9Column);
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public void SetValue9Null()
		{
			base[tableDomainList.Value9Column] = Convert.DBNull;
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public bool IsValue10Null()
		{
			return IsNull(tableDomainList.Value10Column);
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public void SetValue10Null()
		{
			base[tableDomainList.Value10Column] = Convert.DBNull;
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public bool IsValue11Null()
		{
			return IsNull(tableDomainList.Value11Column);
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public void SetValue11Null()
		{
			base[tableDomainList.Value11Column] = Convert.DBNull;
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public bool IsValue12Null()
		{
			return IsNull(tableDomainList.Value12Column);
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public void SetValue12Null()
		{
			base[tableDomainList.Value12Column] = Convert.DBNull;
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public bool IsValue13Null()
		{
			return IsNull(tableDomainList.Value13Column);
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public void SetValue13Null()
		{
			base[tableDomainList.Value13Column] = Convert.DBNull;
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public bool IsValue14Null()
		{
			return IsNull(tableDomainList.Value14Column);
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public void SetValue14Null()
		{
			base[tableDomainList.Value14Column] = Convert.DBNull;
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public bool IsValue15Null()
		{
			return IsNull(tableDomainList.Value15Column);
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public void SetValue15Null()
		{
			base[tableDomainList.Value15Column] = Convert.DBNull;
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public bool IsValue16Null()
		{
			return IsNull(tableDomainList.Value16Column);
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public void SetValue16Null()
		{
			base[tableDomainList.Value16Column] = Convert.DBNull;
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public bool IsValue17Null()
		{
			return IsNull(tableDomainList.Value17Column);
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public void SetValue17Null()
		{
			base[tableDomainList.Value17Column] = Convert.DBNull;
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public bool IsValue18Null()
		{
			return IsNull(tableDomainList.Value18Column);
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public void SetValue18Null()
		{
			base[tableDomainList.Value18Column] = Convert.DBNull;
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public bool IsValue19Null()
		{
			return IsNull(tableDomainList.Value19Column);
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public void SetValue19Null()
		{
			base[tableDomainList.Value19Column] = Convert.DBNull;
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public bool IsValue20Null()
		{
			return IsNull(tableDomainList.Value20Column);
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public void SetValue20Null()
		{
			base[tableDomainList.Value20Column] = Convert.DBNull;
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public bool IsValue21Null()
		{
			return IsNull(tableDomainList.Value21Column);
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public void SetValue21Null()
		{
			base[tableDomainList.Value21Column] = Convert.DBNull;
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public bool IsValue22Null()
		{
			return IsNull(tableDomainList.Value22Column);
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public void SetValue22Null()
		{
			base[tableDomainList.Value22Column] = Convert.DBNull;
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public bool IsValue23Null()
		{
			return IsNull(tableDomainList.Value23Column);
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public void SetValue23Null()
		{
			base[tableDomainList.Value23Column] = Convert.DBNull;
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public bool IsValue24Null()
		{
			return IsNull(tableDomainList.Value24Column);
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public void SetValue24Null()
		{
			base[tableDomainList.Value24Column] = Convert.DBNull;
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public bool IsValue25Null()
		{
			return IsNull(tableDomainList.Value25Column);
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public void SetValue25Null()
		{
			base[tableDomainList.Value25Column] = Convert.DBNull;
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public bool IsValue26Null()
		{
			return IsNull(tableDomainList.Value26Column);
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public void SetValue26Null()
		{
			base[tableDomainList.Value26Column] = Convert.DBNull;
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public bool IsValue27Null()
		{
			return IsNull(tableDomainList.Value27Column);
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public void SetValue27Null()
		{
			base[tableDomainList.Value27Column] = Convert.DBNull;
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public bool IsValue28Null()
		{
			return IsNull(tableDomainList.Value28Column);
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public void SetValue28Null()
		{
			base[tableDomainList.Value28Column] = Convert.DBNull;
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public bool IsValue29Null()
		{
			return IsNull(tableDomainList.Value29Column);
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public void SetValue29Null()
		{
			base[tableDomainList.Value29Column] = Convert.DBNull;
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public bool IsValue30Null()
		{
			return IsNull(tableDomainList.Value30Column);
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public void SetValue30Null()
		{
			base[tableDomainList.Value30Column] = Convert.DBNull;
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public bool IsValue31Null()
		{
			return IsNull(tableDomainList.Value31Column);
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public void SetValue31Null()
		{
			base[tableDomainList.Value31Column] = Convert.DBNull;
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public bool IsValue32Null()
		{
			return IsNull(tableDomainList.Value32Column);
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public void SetValue32Null()
		{
			base[tableDomainList.Value32Column] = Convert.DBNull;
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public bool IsValue33Null()
		{
			return IsNull(tableDomainList.Value33Column);
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public void SetValue33Null()
		{
			base[tableDomainList.Value33Column] = Convert.DBNull;
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public bool IsValue34Null()
		{
			return IsNull(tableDomainList.Value34Column);
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public void SetValue34Null()
		{
			base[tableDomainList.Value34Column] = Convert.DBNull;
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public bool IsValue35Null()
		{
			return IsNull(tableDomainList.Value35Column);
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public void SetValue35Null()
		{
			base[tableDomainList.Value35Column] = Convert.DBNull;
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public bool IsValue36Null()
		{
			return IsNull(tableDomainList.Value36Column);
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public void SetValue36Null()
		{
			base[tableDomainList.Value36Column] = Convert.DBNull;
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public bool IsValue37Null()
		{
			return IsNull(tableDomainList.Value37Column);
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public void SetValue37Null()
		{
			base[tableDomainList.Value37Column] = Convert.DBNull;
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public bool IsValue38Null()
		{
			return IsNull(tableDomainList.Value38Column);
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public void SetValue38Null()
		{
			base[tableDomainList.Value38Column] = Convert.DBNull;
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public bool IsValue39Null()
		{
			return IsNull(tableDomainList.Value39Column);
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public void SetValue39Null()
		{
			base[tableDomainList.Value39Column] = Convert.DBNull;
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public bool IsValue40Null()
		{
			return IsNull(tableDomainList.Value40Column);
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public void SetValue40Null()
		{
			base[tableDomainList.Value40Column] = Convert.DBNull;
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public bool IsValue41Null()
		{
			return IsNull(tableDomainList.Value41Column);
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public void SetValue41Null()
		{
			base[tableDomainList.Value41Column] = Convert.DBNull;
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public bool IsValue42Null()
		{
			return IsNull(tableDomainList.Value42Column);
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public void SetValue42Null()
		{
			base[tableDomainList.Value42Column] = Convert.DBNull;
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public bool IsValue43Null()
		{
			return IsNull(tableDomainList.Value43Column);
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public void SetValue43Null()
		{
			base[tableDomainList.Value43Column] = Convert.DBNull;
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public bool IsValue44Null()
		{
			return IsNull(tableDomainList.Value44Column);
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public void SetValue44Null()
		{
			base[tableDomainList.Value44Column] = Convert.DBNull;
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public bool IsValue45Null()
		{
			return IsNull(tableDomainList.Value45Column);
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public void SetValue45Null()
		{
			base[tableDomainList.Value45Column] = Convert.DBNull;
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public bool IsValue46Null()
		{
			return IsNull(tableDomainList.Value46Column);
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public void SetValue46Null()
		{
			base[tableDomainList.Value46Column] = Convert.DBNull;
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public bool IsValue47Null()
		{
			return IsNull(tableDomainList.Value47Column);
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public void SetValue47Null()
		{
			base[tableDomainList.Value47Column] = Convert.DBNull;
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public bool IsValue48Null()
		{
			return IsNull(tableDomainList.Value48Column);
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public void SetValue48Null()
		{
			base[tableDomainList.Value48Column] = Convert.DBNull;
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public bool IsValue49Null()
		{
			return IsNull(tableDomainList.Value49Column);
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public void SetValue49Null()
		{
			base[tableDomainList.Value49Column] = Convert.DBNull;
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public bool IsValue50Null()
		{
			return IsNull(tableDomainList.Value50Column);
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public void SetValue50Null()
		{
			base[tableDomainList.Value50Column] = Convert.DBNull;
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public bool IsValue51Null()
		{
			return IsNull(tableDomainList.Value51Column);
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public void SetValue51Null()
		{
			base[tableDomainList.Value51Column] = Convert.DBNull;
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public bool IsValue52Null()
		{
			return IsNull(tableDomainList.Value52Column);
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public void SetValue52Null()
		{
			base[tableDomainList.Value52Column] = Convert.DBNull;
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public bool IsValue53Null()
		{
			return IsNull(tableDomainList.Value53Column);
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public void SetValue53Null()
		{
			base[tableDomainList.Value53Column] = Convert.DBNull;
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public bool IsValue54Null()
		{
			return IsNull(tableDomainList.Value54Column);
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public void SetValue54Null()
		{
			base[tableDomainList.Value54Column] = Convert.DBNull;
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public bool IsValue55Null()
		{
			return IsNull(tableDomainList.Value55Column);
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public void SetValue55Null()
		{
			base[tableDomainList.Value55Column] = Convert.DBNull;
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public bool IsValue56Null()
		{
			return IsNull(tableDomainList.Value56Column);
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public void SetValue56Null()
		{
			base[tableDomainList.Value56Column] = Convert.DBNull;
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public bool IsValue57Null()
		{
			return IsNull(tableDomainList.Value57Column);
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public void SetValue57Null()
		{
			base[tableDomainList.Value57Column] = Convert.DBNull;
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public bool IsValue58Null()
		{
			return IsNull(tableDomainList.Value58Column);
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public void SetValue58Null()
		{
			base[tableDomainList.Value58Column] = Convert.DBNull;
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public bool IsValue59Null()
		{
			return IsNull(tableDomainList.Value59Column);
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public void SetValue59Null()
		{
			base[tableDomainList.Value59Column] = Convert.DBNull;
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public bool IsValue60Null()
		{
			return IsNull(tableDomainList.Value60Column);
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public void SetValue60Null()
		{
			base[tableDomainList.Value60Column] = Convert.DBNull;
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public bool IsValue61Null()
		{
			return IsNull(tableDomainList.Value61Column);
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public void SetValue61Null()
		{
			base[tableDomainList.Value61Column] = Convert.DBNull;
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public bool IsValue62Null()
		{
			return IsNull(tableDomainList.Value62Column);
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public void SetValue62Null()
		{
			base[tableDomainList.Value62Column] = Convert.DBNull;
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public bool IsValue63Null()
		{
			return IsNull(tableDomainList.Value63Column);
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public void SetValue63Null()
		{
			base[tableDomainList.Value63Column] = Convert.DBNull;
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public bool IsValue64Null()
		{
			return IsNull(tableDomainList.Value64Column);
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public void SetValue64Null()
		{
			base[tableDomainList.Value64Column] = Convert.DBNull;
		}
	}

	public class UseDomainRow : DataRow
	{
		private UseDomainDataTable tableUseDomain;

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public string SourceTable
		{
			get
			{
				try
				{
					return (string)base[tableUseDomain.SourceTableColumn];
				}
				catch (InvalidCastException innerException)
				{
					throw new StrongTypingException("The value for column 'SourceTable' in table 'UseDomain' is DBNull.", innerException);
				}
			}
			set
			{
				base[tableUseDomain.SourceTableColumn] = value;
			}
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public string SourceColumn
		{
			get
			{
				try
				{
					return (string)base[tableUseDomain.SourceColumnColumn];
				}
				catch (InvalidCastException innerException)
				{
					throw new StrongTypingException("The value for column 'SourceColumn' in table 'UseDomain' is DBNull.", innerException);
				}
			}
			set
			{
				base[tableUseDomain.SourceColumnColumn] = value;
			}
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public string DomainName
		{
			get
			{
				try
				{
					return (string)base[tableUseDomain.DomainNameColumn];
				}
				catch (InvalidCastException innerException)
				{
					throw new StrongTypingException("The value for column 'DomainName' in table 'UseDomain' is DBNull.", innerException);
				}
			}
			set
			{
				base[tableUseDomain.DomainNameColumn] = value;
			}
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		internal UseDomainRow(DataRowBuilder rb)
			: base(rb)
		{
			tableUseDomain = (UseDomainDataTable)base.Table;
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public bool IsSourceTableNull()
		{
			return IsNull(tableUseDomain.SourceTableColumn);
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public void SetSourceTableNull()
		{
			base[tableUseDomain.SourceTableColumn] = Convert.DBNull;
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public bool IsSourceColumnNull()
		{
			return IsNull(tableUseDomain.SourceColumnColumn);
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public void SetSourceColumnNull()
		{
			base[tableUseDomain.SourceColumnColumn] = Convert.DBNull;
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public bool IsDomainNameNull()
		{
			return IsNull(tableUseDomain.DomainNameColumn);
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public void SetDomainNameNull()
		{
			base[tableUseDomain.DomainNameColumn] = Convert.DBNull;
		}
	}

	public class DoubleCrossTableRow : DataRow
	{
		private DoubleCrossTableDataTable tableDoubleCrossTable;

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public string SourceTable
		{
			get
			{
				try
				{
					return (string)base[tableDoubleCrossTable.SourceTableColumn];
				}
				catch (InvalidCastException innerException)
				{
					throw new StrongTypingException("The value for column 'SourceTable' in table 'DoubleCrossTable' is DBNull.", innerException);
				}
			}
			set
			{
				base[tableDoubleCrossTable.SourceTableColumn] = value;
			}
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public string SourceColumn
		{
			get
			{
				try
				{
					return (string)base[tableDoubleCrossTable.SourceColumnColumn];
				}
				catch (InvalidCastException innerException)
				{
					throw new StrongTypingException("The value for column 'SourceColumn' in table 'DoubleCrossTable' is DBNull.", innerException);
				}
			}
			set
			{
				base[tableDoubleCrossTable.SourceColumnColumn] = value;
			}
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public string IntermediateTable
		{
			get
			{
				try
				{
					return (string)base[tableDoubleCrossTable.IntermediateTableColumn];
				}
				catch (InvalidCastException innerException)
				{
					throw new StrongTypingException("The value for column 'IntermediateTable' in table 'DoubleCrossTable' is DBNull.", innerException);
				}
			}
			set
			{
				base[tableDoubleCrossTable.IntermediateTableColumn] = value;
			}
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public string IntermediateKeyColumn
		{
			get
			{
				try
				{
					return (string)base[tableDoubleCrossTable.IntermediateKeyColumnColumn];
				}
				catch (InvalidCastException innerException)
				{
					throw new StrongTypingException("The value for column 'IntermediateKeyColumn' in table 'DoubleCrossTable' is DBNull.", innerException);
				}
			}
			set
			{
				base[tableDoubleCrossTable.IntermediateKeyColumnColumn] = value;
			}
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public string IntermediateJumpColumn
		{
			get
			{
				try
				{
					return (string)base[tableDoubleCrossTable.IntermediateJumpColumnColumn];
				}
				catch (InvalidCastException innerException)
				{
					throw new StrongTypingException("The value for column 'IntermediateJumpColumn' in table 'DoubleCrossTable' is DBNull.", innerException);
				}
			}
			set
			{
				base[tableDoubleCrossTable.IntermediateJumpColumnColumn] = value;
			}
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public string ReferredTable
		{
			get
			{
				try
				{
					return (string)base[tableDoubleCrossTable.ReferredTableColumn];
				}
				catch (InvalidCastException innerException)
				{
					throw new StrongTypingException("The value for column 'ReferredTable' in table 'DoubleCrossTable' is DBNull.", innerException);
				}
			}
			set
			{
				base[tableDoubleCrossTable.ReferredTableColumn] = value;
			}
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public string KeyColumn
		{
			get
			{
				try
				{
					return (string)base[tableDoubleCrossTable.KeyColumnColumn];
				}
				catch (InvalidCastException innerException)
				{
					throw new StrongTypingException("The value for column 'KeyColumn' in table 'DoubleCrossTable' is DBNull.", innerException);
				}
			}
			set
			{
				base[tableDoubleCrossTable.KeyColumnColumn] = value;
			}
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public string DisplayColumn
		{
			get
			{
				try
				{
					return (string)base[tableDoubleCrossTable.DisplayColumnColumn];
				}
				catch (InvalidCastException innerException)
				{
					throw new StrongTypingException("The value for column 'DisplayColumn' in table 'DoubleCrossTable' is DBNull.", innerException);
				}
			}
			set
			{
				base[tableDoubleCrossTable.DisplayColumnColumn] = value;
			}
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		internal DoubleCrossTableRow(DataRowBuilder rb)
			: base(rb)
		{
			tableDoubleCrossTable = (DoubleCrossTableDataTable)base.Table;
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public bool IsSourceTableNull()
		{
			return IsNull(tableDoubleCrossTable.SourceTableColumn);
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public void SetSourceTableNull()
		{
			base[tableDoubleCrossTable.SourceTableColumn] = Convert.DBNull;
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public bool IsSourceColumnNull()
		{
			return IsNull(tableDoubleCrossTable.SourceColumnColumn);
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public void SetSourceColumnNull()
		{
			base[tableDoubleCrossTable.SourceColumnColumn] = Convert.DBNull;
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public bool IsIntermediateTableNull()
		{
			return IsNull(tableDoubleCrossTable.IntermediateTableColumn);
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public void SetIntermediateTableNull()
		{
			base[tableDoubleCrossTable.IntermediateTableColumn] = Convert.DBNull;
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public bool IsIntermediateKeyColumnNull()
		{
			return IsNull(tableDoubleCrossTable.IntermediateKeyColumnColumn);
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public void SetIntermediateKeyColumnNull()
		{
			base[tableDoubleCrossTable.IntermediateKeyColumnColumn] = Convert.DBNull;
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public bool IsIntermediateJumpColumnNull()
		{
			return IsNull(tableDoubleCrossTable.IntermediateJumpColumnColumn);
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public void SetIntermediateJumpColumnNull()
		{
			base[tableDoubleCrossTable.IntermediateJumpColumnColumn] = Convert.DBNull;
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public bool IsReferredTableNull()
		{
			return IsNull(tableDoubleCrossTable.ReferredTableColumn);
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public void SetReferredTableNull()
		{
			base[tableDoubleCrossTable.ReferredTableColumn] = Convert.DBNull;
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public bool IsKeyColumnNull()
		{
			return IsNull(tableDoubleCrossTable.KeyColumnColumn);
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public void SetKeyColumnNull()
		{
			base[tableDoubleCrossTable.KeyColumnColumn] = Convert.DBNull;
		}

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public bool IsDisplayColumnNull()
		{
			return IsNull(tableDoubleCrossTable.DisplayColumnColumn);
		}

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public void SetDisplayColumnNull()
		{
			base[tableDoubleCrossTable.DisplayColumnColumn] = Convert.DBNull;
		}
	}

	[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
	public class CrossTableRowChangeEvent : EventArgs
	{
		private CrossTableRow eventRow;

		private DataRowAction eventAction;

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public CrossTableRow Row => eventRow;

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public DataRowAction Action => eventAction;

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public CrossTableRowChangeEvent(CrossTableRow row, DataRowAction action)
		{
			eventRow = row;
			eventAction = action;
		}
	}

	[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
	public class DomainListRowChangeEvent : EventArgs
	{
		private DomainListRow eventRow;

		private DataRowAction eventAction;

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public DomainListRow Row => eventRow;

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public DataRowAction Action => eventAction;

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public DomainListRowChangeEvent(DomainListRow row, DataRowAction action)
		{
			eventRow = row;
			eventAction = action;
		}
	}

	[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
	public class UseDomainRowChangeEvent : EventArgs
	{
		private UseDomainRow eventRow;

		private DataRowAction eventAction;

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public UseDomainRow Row => eventRow;

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public DataRowAction Action => eventAction;

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public UseDomainRowChangeEvent(UseDomainRow row, DataRowAction action)
		{
			eventRow = row;
			eventAction = action;
		}
	}

	[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
	public class DoubleCrossTableRowChangeEvent : EventArgs
	{
		private DoubleCrossTableRow eventRow;

		private DataRowAction eventAction;

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public DoubleCrossTableRow Row => eventRow;

		[DebuggerNonUserCode]
		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		public DataRowAction Action => eventAction;

		[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
		[DebuggerNonUserCode]
		public DoubleCrossTableRowChangeEvent(DoubleCrossTableRow row, DataRowAction action)
		{
			eventRow = row;
			eventAction = action;
		}
	}

	private CrossTableDataTable tableCrossTable;

	private DomainListDataTable tableDomainList;

	private UseDomainDataTable tableUseDomain;

	private DoubleCrossTableDataTable tableDoubleCrossTable;

	private SchemaSerializationMode _schemaSerializationMode = SchemaSerializationMode.IncludeSchema;

	private string m_SourceTableName;

	private string m_SourceColumnName;

	private string m_RelatedTableName;

	private string m_KeyColumnName;

	private string m_DisplayColumnName;

	private string m_IntermediateTableName;

	private string m_IntermediateJumpColumnName;

	private string m_IntermediateKeyColumnName;

	private string[] m_RelatedKey;

	private string[] m_RelatedDisplay;

	private string[] m_DomainList;

	private bool m_IsValid;

	[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
	[DebuggerNonUserCode]
	[Browsable(false)]
	[DesignerSerializationVisibility(DesignerSerializationVisibility.Content)]
	public CrossTableDataTable CrossTable => tableCrossTable;

	[Browsable(false)]
	[DesignerSerializationVisibility(DesignerSerializationVisibility.Content)]
	[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
	[DebuggerNonUserCode]
	public DomainListDataTable DomainList => tableDomainList;

	[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
	[Browsable(false)]
	[DesignerSerializationVisibility(DesignerSerializationVisibility.Content)]
	[DebuggerNonUserCode]
	public UseDomainDataTable UseDomain => tableUseDomain;

	[Browsable(false)]
	[DesignerSerializationVisibility(DesignerSerializationVisibility.Content)]
	[DebuggerNonUserCode]
	[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
	public DoubleCrossTableDataTable DoubleCrossTable => tableDoubleCrossTable;

	[Browsable(true)]
	[DebuggerNonUserCode]
	[DesignerSerializationVisibility(DesignerSerializationVisibility.Visible)]
	[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
	public override SchemaSerializationMode SchemaSerializationMode
	{
		get
		{
			return _schemaSerializationMode;
		}
		set
		{
			_schemaSerializationMode = value;
		}
	}

	[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
	[DebuggerNonUserCode]
	[DesignerSerializationVisibility(DesignerSerializationVisibility.Hidden)]
	public new DataTableCollection Tables => base.Tables;

	[DebuggerNonUserCode]
	[DesignerSerializationVisibility(DesignerSerializationVisibility.Hidden)]
	[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
	public new DataRelationCollection Relations => base.Relations;

	public string RelatedTableName => m_RelatedTableName;

	public string IntermediateTableName => m_IntermediateTableName;

	public string[] RelatedKey
	{
		get
		{
			return m_RelatedKey;
		}
		set
		{
			m_RelatedKey = value;
		}
	}

	public string[] RelatedDisplay
	{
		get
		{
			return m_RelatedDisplay;
		}
		set
		{
			m_RelatedDisplay = value;
		}
	}

	public bool IsValid
	{
		get
		{
			return m_IsValid;
		}
		set
		{
			m_IsValid = value;
		}
	}

	[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
	[DebuggerNonUserCode]
	public IntelliEdit()
	{
		BeginInit();
		InitClass();
		CollectionChangeEventHandler value = SchemaChanged;
		base.Tables.CollectionChanged += value;
		base.Relations.CollectionChanged += value;
		EndInit();
	}

	[DebuggerNonUserCode]
	[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
	protected IntelliEdit(SerializationInfo info, StreamingContext context)
		: base(info, context, ConstructSchema: false)
	{
		//IL_01af: Unknown result type (might be due to invalid IL or missing references)
		//IL_01b9: Expected O, but got Unknown
		//IL_007d: Unknown result type (might be due to invalid IL or missing references)
		//IL_0087: Expected O, but got Unknown
		if (IsBinarySerialized(info, context))
		{
			InitVars(initTable: false);
			CollectionChangeEventHandler value = SchemaChanged;
			Tables.CollectionChanged += value;
			Relations.CollectionChanged += value;
			return;
		}
		string s = (string)info.GetValue("XmlSchema", typeof(string));
		if (DetermineSchemaSerializationMode(info, context) == SchemaSerializationMode.IncludeSchema)
		{
			DataSet dataSet = new DataSet();
			dataSet.ReadXmlSchema((XmlReader?)new XmlTextReader((TextReader)new StringReader(s)));
			if (dataSet.Tables["CrossTable"] != null)
			{
				base.Tables.Add(new CrossTableDataTable(dataSet.Tables["CrossTable"]));
			}
			if (dataSet.Tables["DomainList"] != null)
			{
				base.Tables.Add(new DomainListDataTable(dataSet.Tables["DomainList"]));
			}
			if (dataSet.Tables["UseDomain"] != null)
			{
				base.Tables.Add(new UseDomainDataTable(dataSet.Tables["UseDomain"]));
			}
			if (dataSet.Tables["DoubleCrossTable"] != null)
			{
				base.Tables.Add(new DoubleCrossTableDataTable(dataSet.Tables["DoubleCrossTable"]));
			}
			base.DataSetName = dataSet.DataSetName;
			base.Prefix = dataSet.Prefix;
			base.Namespace = dataSet.Namespace;
			base.Locale = dataSet.Locale;
			base.CaseSensitive = dataSet.CaseSensitive;
			base.EnforceConstraints = dataSet.EnforceConstraints;
			Merge(dataSet, preserveChanges: false, MissingSchemaAction.Add);
			InitVars();
		}
		else
		{
			ReadXmlSchema((XmlReader?)new XmlTextReader((TextReader)new StringReader(s)));
		}
		GetSerializationData(info, context);
		CollectionChangeEventHandler value2 = SchemaChanged;
		base.Tables.CollectionChanged += value2;
		Relations.CollectionChanged += value2;
	}

	[DebuggerNonUserCode]
	[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
	protected override void InitializeDerivedDataSet()
	{
		BeginInit();
		InitClass();
		EndInit();
	}

	[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
	[DebuggerNonUserCode]
	public override DataSet Clone()
	{
		IntelliEdit intelliEdit = (IntelliEdit)base.Clone();
		intelliEdit.InitVars();
		intelliEdit.SchemaSerializationMode = SchemaSerializationMode;
		return intelliEdit;
	}

	[DebuggerNonUserCode]
	[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
	protected override bool ShouldSerializeTables()
	{
		return false;
	}

	[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
	[DebuggerNonUserCode]
	protected override bool ShouldSerializeRelations()
	{
		return false;
	}

	[DebuggerNonUserCode]
	[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
	protected override void ReadXmlSerializable(XmlReader reader)
	{
		if (DetermineSchemaSerializationMode(reader) == SchemaSerializationMode.IncludeSchema)
		{
			Reset();
			DataSet dataSet = new DataSet();
			dataSet.ReadXml(reader);
			if (dataSet.Tables["CrossTable"] != null)
			{
				base.Tables.Add(new CrossTableDataTable(dataSet.Tables["CrossTable"]));
			}
			if (dataSet.Tables["DomainList"] != null)
			{
				base.Tables.Add(new DomainListDataTable(dataSet.Tables["DomainList"]));
			}
			if (dataSet.Tables["UseDomain"] != null)
			{
				base.Tables.Add(new UseDomainDataTable(dataSet.Tables["UseDomain"]));
			}
			if (dataSet.Tables["DoubleCrossTable"] != null)
			{
				base.Tables.Add(new DoubleCrossTableDataTable(dataSet.Tables["DoubleCrossTable"]));
			}
			base.DataSetName = dataSet.DataSetName;
			base.Prefix = dataSet.Prefix;
			base.Namespace = dataSet.Namespace;
			base.Locale = dataSet.Locale;
			base.CaseSensitive = dataSet.CaseSensitive;
			base.EnforceConstraints = dataSet.EnforceConstraints;
			Merge(dataSet, preserveChanges: false, MissingSchemaAction.Add);
			InitVars();
		}
		else
		{
			ReadXml(reader);
			InitVars();
		}
	}

	[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
	[DebuggerNonUserCode]
	protected override XmlSchema GetSchemaSerializable()
	{
		//IL_0009: Unknown result type (might be due to invalid IL or missing references)
		//IL_0013: Expected O, but got Unknown
		//IL_001c: Unknown result type (might be due to invalid IL or missing references)
		//IL_0027: Expected O, but got Unknown
		MemoryStream memoryStream = new MemoryStream();
		WriteXmlSchema((XmlWriter?)new XmlTextWriter((Stream)memoryStream, (Encoding)null));
		memoryStream.Position = 0L;
		return XmlSchema.Read((XmlReader)new XmlTextReader((Stream)memoryStream), (ValidationEventHandler)null);
	}

	[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
	[DebuggerNonUserCode]
	internal void InitVars()
	{
		InitVars(initTable: true);
	}

	[DebuggerNonUserCode]
	[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
	internal void InitVars(bool initTable)
	{
		tableCrossTable = (CrossTableDataTable)base.Tables["CrossTable"];
		if (initTable && tableCrossTable != null)
		{
			tableCrossTable.InitVars();
		}
		tableDomainList = (DomainListDataTable)base.Tables["DomainList"];
		if (initTable && tableDomainList != null)
		{
			tableDomainList.InitVars();
		}
		tableUseDomain = (UseDomainDataTable)base.Tables["UseDomain"];
		if (initTable && tableUseDomain != null)
		{
			tableUseDomain.InitVars();
		}
		tableDoubleCrossTable = (DoubleCrossTableDataTable)base.Tables["DoubleCrossTable"];
		if (initTable && tableDoubleCrossTable != null)
		{
			tableDoubleCrossTable.InitVars();
		}
	}

	[DebuggerNonUserCode]
	[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
	private void InitClass()
	{
		base.DataSetName = "IntelliEdit";
		base.Prefix = "";
		base.Namespace = "http://tempuri.org/IntelliEdit.xsd";
		base.Locale = new CultureInfo("it-IT");
		base.EnforceConstraints = false;
		SchemaSerializationMode = SchemaSerializationMode.IncludeSchema;
		tableCrossTable = new CrossTableDataTable();
		base.Tables.Add(tableCrossTable);
		tableDomainList = new DomainListDataTable();
		base.Tables.Add(tableDomainList);
		tableUseDomain = new UseDomainDataTable();
		base.Tables.Add(tableUseDomain);
		tableDoubleCrossTable = new DoubleCrossTableDataTable();
		base.Tables.Add(tableDoubleCrossTable);
	}

	[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
	[DebuggerNonUserCode]
	private bool ShouldSerializeCrossTable()
	{
		return false;
	}

	[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
	[DebuggerNonUserCode]
	private bool ShouldSerializeDomainList()
	{
		return false;
	}

	[DebuggerNonUserCode]
	[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
	private bool ShouldSerializeUseDomain()
	{
		return false;
	}

	[DebuggerNonUserCode]
	[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
	private bool ShouldSerializeDoubleCrossTable()
	{
		return false;
	}

	[DebuggerNonUserCode]
	[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
	private void SchemaChanged(object sender, CollectionChangeEventArgs e)
	{
		if (e.Action == CollectionChangeAction.Remove)
		{
			InitVars();
		}
	}

	[DebuggerNonUserCode]
	[GeneratedCode("System.Data.Design.TypedDataSetGenerator", "4.0.0.0")]
	public static XmlSchemaComplexType GetTypedDataSetSchema(XmlSchemaSet xs)
	{
		//IL_0006: Unknown result type (might be due to invalid IL or missing references)
		//IL_000c: Expected O, but got Unknown
		//IL_000c: Unknown result type (might be due to invalid IL or missing references)
		//IL_0012: Expected O, but got Unknown
		//IL_0012: Unknown result type (might be due to invalid IL or missing references)
		//IL_0018: Expected O, but got Unknown
		//IL_0089: Unknown result type (might be due to invalid IL or missing references)
		//IL_0090: Expected O, but got Unknown
		IntelliEdit intelliEdit = new IntelliEdit();
		XmlSchemaComplexType val = new XmlSchemaComplexType();
		XmlSchemaSequence val2 = new XmlSchemaSequence();
		XmlSchemaAny val3 = new XmlSchemaAny();
		val3.Namespace = intelliEdit.Namespace;
		((XmlSchemaGroupBase)val2).Items.Add((XmlSchemaObject)(object)val3);
		val.Particle = (XmlSchemaParticle)(object)val2;
		XmlSchema schemaSerializable = intelliEdit.GetSchemaSerializable();
		if (xs.Contains(schemaSerializable.TargetNamespace))
		{
			MemoryStream memoryStream = new MemoryStream();
			MemoryStream memoryStream2 = new MemoryStream();
			try
			{
				XmlSchema val4 = null;
				schemaSerializable.Write((Stream)memoryStream);
				IEnumerator enumerator = xs.Schemas(schemaSerializable.TargetNamespace).GetEnumerator();
				while (enumerator.MoveNext())
				{
					val4 = (XmlSchema)enumerator.Current;
					memoryStream2.SetLength(0L);
					val4.Write((Stream)memoryStream2);
					if (memoryStream.Length == memoryStream2.Length)
					{
						memoryStream.Position = 0L;
						memoryStream2.Position = 0L;
						while (memoryStream.Position != memoryStream.Length && memoryStream.ReadByte() == memoryStream2.ReadByte())
						{
						}
						if (memoryStream.Position == memoryStream.Length)
						{
							return val;
						}
					}
				}
			}
			finally
			{
				memoryStream?.Close();
				memoryStream2?.Close();
			}
		}
		xs.Add(schemaSerializable);
		return val;
	}

	public IntelliEdit(string sourceTable, string sourceColumn, string relatedTable, string keyColumn, string displayColumn)
	{
		m_SourceTableName = sourceTable;
		m_SourceColumnName = sourceColumn;
		m_RelatedTableName = relatedTable;
		m_KeyColumnName = keyColumn;
		m_DisplayColumnName = displayColumn;
		m_IntermediateTableName = null;
		m_IntermediateJumpColumnName = null;
		m_IntermediateKeyColumnName = null;
		m_DomainList = null;
	}

	public IntelliEdit(string sourceTable, string sourceColumn, string[] domainList)
	{
		m_SourceTableName = sourceTable;
		m_SourceColumnName = sourceColumn;
		m_DomainList = domainList;
	}

	public IntelliEdit(string sourceTable, string sourceColumn, string intermediateTable, string intermediateKeyColumn, string intermediateJumpColumn, string relatedTable, string keyColumn, string displayColumn)
	{
		m_SourceTableName = sourceTable;
		m_SourceColumnName = sourceColumn;
		m_IntermediateTableName = intermediateTable;
		m_IntermediateKeyColumnName = intermediateKeyColumn;
		m_IntermediateJumpColumnName = intermediateJumpColumn;
		m_RelatedTableName = relatedTable;
		m_KeyColumnName = keyColumn;
		m_DisplayColumnName = displayColumn;
		m_DomainList = null;
	}

	public bool Apply(DataSet dataSet)
	{
		int num = 0;
		int num2 = 0;
		int num3 = -1;
		int num4 = -1;
		int num5 = -1;
		int index = -1;
		int num6 = -1;
		int num7 = -1;
		if (m_DomainList != null)
		{
			m_IsValid = m_DomainList.Length > 0;
			return true;
		}
		for (int i = 0; i < dataSet.Tables.Count; i++)
		{
			if (dataSet.Tables[i].TableName == m_IntermediateTableName)
			{
				num3 = i;
				num = dataSet.Tables[i].Rows.Count;
				for (int j = 0; j < dataSet.Tables[i].Columns.Count; j++)
				{
					if (dataSet.Tables[num3].Columns[j].ColumnName == m_IntermediateKeyColumnName)
					{
						num4 = j;
					}
					if (dataSet.Tables[num3].Columns[j].ColumnName == m_IntermediateJumpColumnName)
					{
						num5 = j;
					}
				}
			}
			if (!(dataSet.Tables[i].TableName == m_RelatedTableName))
			{
				continue;
			}
			index = i;
			num2 = dataSet.Tables[i].Rows.Count;
			for (int k = 0; k < dataSet.Tables[i].Columns.Count; k++)
			{
				if (dataSet.Tables[index].Columns[k].ColumnName == m_KeyColumnName)
				{
					num6 = k;
				}
				if (dataSet.Tables[index].Columns[k].ColumnName == m_DisplayColumnName)
				{
					num7 = k;
				}
			}
		}
		if (num6 == -1 || num7 == -1)
		{
			m_IsValid = false;
			return m_IsValid;
		}
		if (num3 != -1)
		{
			if (num4 == -1 || num5 == -1)
			{
				m_IsValid = false;
				return m_IsValid;
			}
			m_RelatedKey = new string[num];
			for (int l = 0; l < m_RelatedKey.Length; l++)
			{
				m_RelatedKey[l] = dataSet.Tables[num3].Rows[l].ItemArray[num4].ToString();
			}
		}
		else
		{
			m_RelatedKey = new string[num2];
			for (int m = 0; m < m_RelatedKey.Length; m++)
			{
				m_RelatedKey[m] = dataSet.Tables[index].Rows[m].ItemArray[num6].ToString();
			}
		}
		m_RelatedDisplay = new string[m_RelatedKey.Length];
		for (int n = 0; n < m_RelatedKey.Length; n++)
		{
			m_RelatedDisplay[n] = string.Empty;
		}
		for (int num8 = 0; num8 < m_RelatedKey.Length; num8++)
		{
			int num9 = num8;
			if (num3 != -1)
			{
				num9 = (int)dataSet.Tables[num3].Rows[num8].ItemArray[num5];
				for (int num10 = ((num9 < dataSet.Tables[index].Rows.Count) ? num9 : (dataSet.Tables[index].Rows.Count - 1)); num10 >= 0; num10--)
				{
					if (num9 == (int)dataSet.Tables[index].Rows[num10].ItemArray[num6])
					{
						m_RelatedDisplay[num8] = dataSet.Tables[index].Rows[num10].ItemArray[num7].ToString() + " (" + m_RelatedKey[num8] + ")";
						break;
					}
				}
			}
			else if (num9 < dataSet.Tables[index].Rows.Count)
			{
				m_RelatedDisplay[num8] = dataSet.Tables[index].Rows[num9].ItemArray[num7].ToString();
			}
		}
		m_IsValid = true;
		return m_IsValid;
	}

	public void InitShow(ComboBox combo, DateTimePicker dateTimePicker)
	{
		combo.Items.Clear();
		if (m_RelatedDisplay != null)
		{
			combo.Items.AddRange((object[])m_RelatedDisplay);
		}
		else if (m_DomainList != null)
		{
			combo.Items.AddRange((object[])m_DomainList);
		}
	}

	public void Show(ComboBox combo, DateTimePicker dateTimePicker, string key, int minValue)
	{
		if (!string.IsNullOrEmpty(key))
		{
			if (m_DomainList != null && m_DomainList[0] != "date")
			{
				key = (Convert.ToInt32(key) - minValue).ToString();
			}
			Show(combo, dateTimePicker, key);
		}
	}

	public void Show(ComboBox combo, DateTimePicker dateTimePicker, string key)
	{
		if (m_RelatedDisplay != null)
		{
			((Control)combo).Visible = true;
			((Control)dateTimePicker).Visible = false;
			int i;
			for (i = 0; i < m_RelatedKey.Length; i++)
			{
				if (m_RelatedKey[i] == key)
				{
					((ListControl)combo).SelectedIndex = i;
					break;
				}
			}
			if (i == m_RelatedKey.Length)
			{
				((ListControl)combo).SelectedIndex = -1;
				((Control)combo).Text = "not found";
			}
		}
		else
		{
			if (m_DomainList == null)
			{
				return;
			}
			if (m_DomainList[0] == "date")
			{
				((Control)combo).Visible = false;
				((Control)dateTimePicker).Visible = true;
				DateTime value = FifaUtil.ConvertToDate(Convert.ToInt32(key));
				dateTimePicker.Value = value;
				return;
			}
			((Control)combo).Visible = true;
			((Control)dateTimePicker).Visible = false;
			int i = Convert.ToInt32(key);
			if (i >= 0 && i < combo.Items.Count)
			{
				((ListControl)combo).SelectedIndex = i;
				return;
			}
			((ListControl)combo).SelectedIndex = -1;
			((Control)combo).Text = "not found";
		}
	}

	public object GetRelatedKey(int comboIndex)
	{
		if (m_RelatedKey != null)
		{
			return m_RelatedKey[comboIndex];
		}
		if (m_DomainList != null)
		{
			return comboIndex;
		}
		return null;
	}

	public object GetRelatedKey(int comboIndex, int minValue)
	{
		if (m_RelatedKey != null)
		{
			return m_RelatedKey[comboIndex];
		}
		if (m_DomainList != null)
		{
			int num = comboIndex + minValue;
			return num;
		}
		return null;
	}

	public bool AreYou(string tableName, string columnName)
	{
		if (m_SourceTableName == tableName && m_SourceColumnName == columnName)
		{
			return m_IsValid;
		}
		return false;
	}

	public bool IsUsed(string tableName)
	{
		return m_SourceTableName == tableName;
	}
}
