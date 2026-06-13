using System;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.IO;
using System.Text;
using System.Windows.Forms;
using FifaControls;
using FifaLibrary;

namespace DbMaster;

public class DbMaster : Form
{
	public int g_CellCounter;

	public string m_InstallDir;

	public string m_LaunchDir;

	public string m_SaveFolder;

	private string m_FifaDbFileName;

	private DbFile m_FifaDbFile;

	private string m_XmlFileName;

	private DataSet m_DataSet;

	private DataTable m_CurrentTable;

	private UnicodeEncoding m_Encoder = new UnicodeEncoding();

	private string m_CopiedTableName;

	private DataRow[] m_CopiedRecords;

	private IntelliEdit[] m_IntelliEdit;

	private DataSet m_IntelliEditSet;

	private IntelliEdit m_CurrentIntelliEdit;

	private bool m_IsIntegerColumn;

	private bool m_ChangeColumnSema = true;

	private bool m_ChangeValueSema = true;

	private bool m_ImportingTableSema;

	private UserMessage m_UserMessage = new UserMessage();

	private bool m_IsDbFileOpen;

	private AboutForm m_AboutForm;

	private string m_LatestGame;

	private Localization m_Localizer;

	private IContainer components;

	private MenuStrip mainMenu;

	private StatusStrip statusStrip;

	private ToolStripProgressBar progressBar;

	private ToolStripStatusLabel statusLabel;

	private ToolStripMenuItem menuFile;

	private ToolStripMenuItem menuOpen;

	private ToolStripMenuItem menuSave;

	private ToolStripMenuItem menuClose;

	private ToolStripMenuItem menuExit;

	private ToolStripMenuItem menuTable;

	private ToolStripMenuItem menuExportCsv;

	private ToolStripMenuItem menuImportCsv;

	private ToolStripMenuItem menuExportAll;

	private ToolStripMenuItem menuImportAll;

	private ToolStripMenuItem menuRecord;

	private ToolStripMenuItem menuCopy;

	private ToolStripMenuItem menuPaste;

	private ToolStripMenuItem menuReplace;

	private ToolStripMenuItem menuDelete;

	private ToolStripMenuItem menuCount;

	private ToolStripMenuItem menuTools;

	private ToolStripMenuItem menuLoadIntelli;

	private ToolStripMenuItem menuHelp;

	private ToolStripMenuItem menuHelpFile;

	private ToolStripMenuItem menuAbout;

	private Panel panelTop;

	private ListBox listBoxTables;

	private DataGridView dataGridView;

	private Label labelMax;

	private NumericUpDown numericMax;

	private Label labelMin;

	private NumericUpDown numericMin;

	private ComboBox comboIntelli;

	private ComboBox comboSearch;

	private ToolStrip toolStrip;

	private ToolStripTextBox textSearch;

	private ToolStripButton buttonFindExactly;

	private ToolStripButton buttonFind;

	private ToolStripSeparator toolStripSeparator1;

	private TextBox textType;

	private ToolStripButton buttonExportSingle;

	private ToolStripButton buttonExportMulti;

	private ToolStripButton buttonImportSingle;

	private ToolStripButton buttonImportMulti;

	private ToolStripSeparator toolStripSeparator2;

	private ToolStripButton buttonRecordCopy;

	private ToolStripButton buttonRecordcInsert;

	private ToolStripButton buttonRecordcReplace;

	private ToolStripButton buttonRecordcDelete;

	private ToolStripButton buttonRecordcCount;

	private ToolStripSeparator toolStripSeparator3;

	private ToolStripButton buttonOpen;

	private ToolStripButton buttonSave;

	private ToolStripButton buttonClose;

	private ToolStripMenuItem menuEnableAllMessages;

	private OpenFileDialog openFileDialog;

	private DateTimePicker dateIntelli;

	private SplitContainer splitContainer1;

	private SaveFileDialog saveFileDialog;

	private FolderBrowserDialog folderBrowser;

	private ContextMenuStrip contextMenuCell;

	private ToolStripMenuItem menuFind;

	private ToolStripMenuItem menuSort;

	private ToolStripMenuItem findExactlyToolStripMenuItem;

	private ToolStripButton buttonIntelliEdit;

	private ToolStripMenuItem expandFifadbToolStripMenuItem;

	private ToolStripMenuItem diagnosticToolStripMenuItem;

	private ToolStripMenuItem extractFromBigToolStripMenuItem;

	private ToolStripMenuItem mainDatabaseToolStripMenuItem;

	private ToolStripMenuItem localDatabasesToolStripMenuItem;

	private Button buttonComputeHash;

	private ToolStripMenuItem calculateHashidToolStripMenuItem;

	public DbMaster()
	{
		InitializeComponent();
		m_LaunchDir = Environment.CurrentDirectory;
		m_SaveFolder = Environment.GetFolderPath(Environment.SpecialFolder.Personal) + "\\FM_temp";
		if (!Directory.Exists(m_SaveFolder))
		{
			Directory.CreateDirectory(m_SaveFolder);
		}
		m_LatestGame = RegistryInfo.GetLatestFifaInstalled();
		if (m_LatestGame != null)
		{
			m_InstallDir = RegistryInfo.GetInstallDir(m_LatestGame);
			((ToolStripItem)extractFromBigToolStripMenuItem).Enabled = true;
		}
		else
		{
			m_InstallDir = m_SaveFolder;
			((ToolStripItem)extractFromBigToolStripMenuItem).Enabled = false;
		}
		EnableMenus(enable: false);
		string text = m_LaunchDir + "\\FIFA.XML";
		if (File.Exists(text))
		{
			LoadXmlIntelliEdit(text);
		}
		m_AboutForm = new AboutForm();
		((Control)m_AboutForm.labelProduct).Text = "DB MASTER";
		((Control)m_AboutForm.labelRelease).Text = "Version 14.0";
		m_Localizer = new Localization();
		m_Localizer.LocalizeControl((Control)(object)this);
		m_Localizer.LocalizeMenu(mainMenu);
		m_Localizer.LocalizeToolStrip(toolStrip);
		((ToolStripItem)statusLabel).Text = m_Localizer.GetString("Ready");
	}

	private void EnableMenus(bool enable)
	{
		((ToolStripItem)menuSave).Enabled = enable;
		((ToolStripItem)menuClose).Enabled = enable;
		((ToolStripItem)menuTable).Enabled = enable;
		((ToolStripItem)menuRecord).Enabled = enable;
		((ToolStripItem)menuTools).Enabled = enable;
		((ToolStripItem)buttonSave).Enabled = enable;
		((ToolStripItem)buttonClose).Enabled = enable;
		((ToolStripItem)buttonImportSingle).Enabled = enable;
		((ToolStripItem)buttonImportMulti).Enabled = enable;
		((ToolStripItem)buttonExportSingle).Enabled = enable;
		((ToolStripItem)buttonExportMulti).Enabled = enable;
		((ToolStripItem)buttonIntelliEdit).Enabled = enable;
		((ToolStripItem)buttonRecordCopy).Enabled = enable;
		((ToolStripItem)buttonRecordcCount).Enabled = enable;
		((ToolStripItem)buttonRecordcDelete).Enabled = enable;
		((ToolStripItem)buttonRecordcInsert).Enabled = enable;
		((ToolStripItem)buttonRecordcReplace).Enabled = enable;
		((ToolStripItem)buttonFind).Enabled = enable;
		((ToolStripItem)buttonFindExactly).Enabled = enable;
		((ToolStripItem)textSearch).Enabled = enable;
	}

	private void EnablePanels(bool enable)
	{
		((Control)panelTop).Enabled = enable;
	}

	private bool BrowseDB()
	{
		//IL_004f: Unknown result type (might be due to invalid IL or missing references)
		//IL_0055: Invalid comparison between Unknown and I4
		((FileDialog)openFileDialog).InitialDirectory = m_InstallDir + "\\Game\\data\\db\\";
		((FileDialog)openFileDialog).Filter = "db files (*.db)|*.db";
		((FileDialog)openFileDialog).FilterIndex = 1;
		((FileDialog)openFileDialog).Title = "Open Database File";
		bool result = false;
		if ((int)((CommonDialog)openFileDialog).ShowDialog() == 1)
		{
			m_FifaDbFileName = ((FileDialog)openFileDialog).FileName;
			result = true;
		}
		return result;
	}

	private bool BrowseXml()
	{
		//IL_004f: Unknown result type (might be due to invalid IL or missing references)
		//IL_0055: Invalid comparison between Unknown and I4
		((FileDialog)openFileDialog).InitialDirectory = m_InstallDir + "\\Game\\data\\db\\";
		((FileDialog)openFileDialog).Filter = "xml files (*.xml)|*.xml";
		((FileDialog)openFileDialog).FilterIndex = 1;
		((FileDialog)openFileDialog).Title = "Open XML Descriptor File";
		bool result = false;
		if ((int)((CommonDialog)openFileDialog).ShowDialog() == 1)
		{
			m_XmlFileName = ((FileDialog)openFileDialog).FileName;
			result = true;
		}
		return result;
	}

	private void InitializeListBoxTables()
	{
		listBoxTables.Items.Clear();
		for (int i = 0; i < m_DataSet.Tables.Count; i++)
		{
			listBoxTables.Items.Add((object)m_DataSet.Tables[i].TableName);
		}
		m_ChangeColumnSema = false;
		((ListControl)listBoxTables).SelectedIndex = 0;
		m_ChangeColumnSema = true;
		m_IsDbFileOpen = true;
		EnableMenus(enable: true);
		EnablePanels(enable: true);
	}

	private void mDataSet_ColumnChanging(object sender, DataColumnChangeEventArgs e)
	{
		if (m_ImportingTableSema || !m_IsIntegerColumn)
		{
			return;
		}
		int num = (int)numericMin.Value;
		int num2 = (int)numericMax.Value;
		int num3 = num;
		string text = e.ProposedValue.ToString();
		if (string.Empty != text)
		{
			num3 = Convert.ToInt32(e.ProposedValue);
		}
		if (num == 0 && num2 == -1)
		{
			return;
		}
		if (num2 == -1)
		{
			if (num3 < num)
			{
				e.ProposedValue = num.ToString();
			}
			return;
		}
		if (num3 < num)
		{
			e.ProposedValue = num.ToString();
		}
		if (num3 > num2)
		{
			e.ProposedValue = num2.ToString();
		}
	}

	private void OpenXmlAndDb()
	{
		if (m_IsDbFileOpen && AskAndSave())
		{
			CloseDb();
		}
		if (BrowseXml() && BrowseDB())
		{
			((ToolStripItem)statusLabel).Text = m_Localizer.GetString("Loading Database ...");
			((Control)this).Cursor = Cursors.WaitCursor;
			((Control)this).Refresh();
			m_FifaDbFile = new DbFile(m_FifaDbFileName, m_XmlFileName, progressBar);
			((Control)this).Refresh();
			((ToolStripItem)statusLabel).Text = m_Localizer.GetString("Rendering Tables ...");
			((Control)statusStrip).Refresh();
			m_DataSet = m_FifaDbFile.ConvertToDataSet();
			for (int i = 0; i < m_DataSet.Tables.Count; i++)
			{
				m_DataSet.Tables[i].ColumnChanging += mDataSet_ColumnChanging;
			}
			dataGridView.DataSource = m_DataSet;
			dataGridView.DataMember = m_DataSet.Tables[0].TableName;
			InitializeListBoxTables();
			((Control)listBoxTables).Refresh();
			((ToolStripItem)statusLabel).Text = m_Localizer.GetString("Loading Intelli-Edit ...");
			((Control)statusStrip).Refresh();
			PrepareIntelliEdit();
			((Control)this).Cursor = Cursors.Default;
			progressBar.Value = 0;
			((ToolStripItem)statusLabel).Text = m_Localizer.GetString("Ready");
			((Control)statusStrip).Refresh();
			((Control)this).Text = Path.GetFileName(m_FifaDbFileName) + " - DB Master";
		}
	}

	private void menuOpen_Click(object sender, EventArgs e)
	{
		OpenXmlAndDb();
	}

	private void menuSave_Click(object sender, EventArgs e)
	{
		if (m_IsDbFileOpen)
		{
			SaveDb();
			SaveXml();
		}
	}

	private void SaveXml()
	{
		m_FifaDbFile.SaveXml(m_XmlFileName);
	}

	private void SaveDb()
	{
		((ToolStripItem)statusLabel).Text = m_Localizer.GetString("Saving");
		((Control)this).Cursor = Cursors.WaitCursor;
		((Control)this).Refresh();
		m_FifaDbFile.ConvertFromDataSet(m_DataSet);
		File.Copy(m_FifaDbFile.FileName, m_FifaDbFile.FileName + ".bak", overwrite: true);
		m_FifaDbFile.SaveDb(m_FifaDbFile.FileName);
		((Control)this).Cursor = Cursors.Default;
		progressBar.Value = 0;
		((ToolStripItem)statusLabel).Text = m_Localizer.GetString("Ready");
	}

	private void menuExit_Click(object sender, EventArgs e)
	{
		if (m_IsDbFileOpen)
		{
			if (AskAndSave())
			{
				Application.Exit();
			}
		}
		else
		{
			Application.Exit();
		}
	}

	private bool AskAndSave()
	{
		//IL_0007: Unknown result type (might be due to invalid IL or missing references)
		//IL_000c: Unknown result type (might be due to invalid IL or missing references)
		//IL_000d: Unknown result type (might be due to invalid IL or missing references)
		//IL_000f: Invalid comparison between Unknown and I4
		//IL_001f: Unknown result type (might be due to invalid IL or missing references)
		//IL_0021: Invalid comparison between Unknown and I4
		//IL_0023: Unknown result type (might be due to invalid IL or missing references)
		//IL_0025: Invalid comparison between Unknown and I4
		DialogResult val = m_UserMessage.ShowMessage(1);
		if ((int)val == 6)
		{
			SaveDb();
			SaveXml();
			return true;
		}
		if ((int)val == 7 || (int)val == 1)
		{
			return true;
		}
		return false;
	}

	private void menuClose_Click(object sender, EventArgs e)
	{
		if (AskAndSave())
		{
			CloseDb();
		}
	}

	private void CloseDb()
	{
		m_IsDbFileOpen = false;
		EnableMenus(enable: false);
		EnablePanels(enable: false);
		listBoxTables.Items.Clear();
		dataGridView.DataSource = null;
		((Control)comboIntelli).Text = string.Empty;
		((Control)comboSearch).Text = string.Empty;
		((ToolStripItem)textSearch).Text = string.Empty;
		((Control)this).Text = " DB Master";
	}

	private void listBox_SelectedIndexChanged(object sender, EventArgs e)
	{
		int selectedIndex = ((ListControl)listBoxTables).SelectedIndex;
		((Control)listBoxTables).Cursor = Cursors.WaitCursor;
		m_CurrentTable = m_DataSet.Tables[selectedIndex];
		dataGridView.DataMember = m_CurrentTable.TableName;
		SetDisplayIndex();
		UpdateComboSearch();
		((Control)comboIntelli).Visible = false;
		((Control)dateIntelli).Visible = false;
		((Control)comboIntelli).Text = "";
		((Control)listBoxTables).Cursor = Cursors.Default;
	}

	private void SetDisplayIndex()
	{
		int currentDisplayIndex = 0;
		try
		{
			if (m_CurrentTable.TableName == string.Empty)
			{
				return;
			}
			if (m_CurrentTable.TableName == "physio")
			{
				SetNextFieldInGridView("physioid", ref currentDisplayIndex);
				SetNextFieldInGridView("firstname", ref currentDisplayIndex);
				SetNextFieldInGridView("surname", ref currentDisplayIndex);
				SetNextFieldInGridView("birthdate", ref currentDisplayIndex);
				SetNextFieldInGridView("headtypecode", ref currentDisplayIndex);
				SetNextFieldInGridView("headclasscode", ref currentDisplayIndex);
				SetNextFieldInGridView("skintonecode", ref currentDisplayIndex);
				SetNextFieldInGridView("facialhairtypecode", ref currentDisplayIndex);
				SetNextFieldInGridView("facialhaircolorcode", ref currentDisplayIndex);
				SetNextFieldInGridView("hairtypecode", ref currentDisplayIndex);
				SetNextFieldInGridView("haircolorcode", ref currentDisplayIndex);
				SetNextFieldInGridView("eyecolorcode", ref currentDisplayIndex);
				SetNextFieldInGridView("eyebrowcode", ref currentDisplayIndex);
				return;
			}
			if (m_CurrentTable.TableName == "nations")
			{
				SetNextFieldInGridView("nationid", ref currentDisplayIndex);
				SetNextFieldInGridView("nationname", ref currentDisplayIndex);
				SetNextFieldInGridView("confederation", ref currentDisplayIndex);
				SetNextFieldInGridView("teamid", ref currentDisplayIndex);
				SetNextFieldInGridView("nationstartingfirstletter", ref currentDisplayIndex);
				return;
			}
			if (m_CurrentTable.TableName == "mm_rtsg")
			{
				SetNextFieldInGridView("rtsg", ref currentDisplayIndex);
				SetNextFieldInGridView("tournament_type", ref currentDisplayIndex);
				SetNextFieldInGridView("appears_in_career", ref currentDisplayIndex);
				SetNextFieldInGridView("appears_in_tournament", ref currentDisplayIndex);
				SetNextFieldInGridView("asset_id", ref currentDisplayIndex);
				SetNextFieldInGridView("is_play_off_tournament", ref currentDisplayIndex);
				SetNextFieldInGridView("qualify_from_this_year", ref currentDisplayIndex);
				SetNextFieldInGridView("start_week", ref currentDisplayIndex);
				SetNextFieldInGridView("start_month", ref currentDisplayIndex);
				SetNextFieldInGridView("start_next_year", ref currentDisplayIndex);
				SetNextFieldInGridView("end_week", ref currentDisplayIndex);
				SetNextFieldInGridView("end_month", ref currentDisplayIndex);
				SetNextFieldInGridView("end_next_year", ref currentDisplayIndex);
				SetNextFieldInGridView("country_id", ref currentDisplayIndex);
				SetNextFieldInGridView("num_games_per_team", ref currentDisplayIndex);
				SetNextFieldInGridView("monday", ref currentDisplayIndex);
				SetNextFieldInGridView("tuesday", ref currentDisplayIndex);
				SetNextFieldInGridView("wednesday", ref currentDisplayIndex);
				SetNextFieldInGridView("thursday", ref currentDisplayIndex);
				SetNextFieldInGridView("friday", ref currentDisplayIndex);
				SetNextFieldInGridView("saturday", ref currentDisplayIndex);
				SetNextFieldInGridView("sunday", ref currentDisplayIndex);
				SetNextFieldInGridView("use_away_goal_rule", ref currentDisplayIndex);
				SetNextFieldInGridView("stage_tournament_index", ref currentDisplayIndex);
				SetNextFieldInGridView("num_subs", ref currentDisplayIndex);
				SetNextFieldInGridView("num_yellows_for_red", ref currentDisplayIndex);
				return;
			}
			if (m_CurrentTable.TableName == "mm_team_lookup")
			{
				SetNextFieldInGridView("rtsgt", ref currentDisplayIndex);
				SetNextFieldInGridView("move_to_rtsgt", ref currentDisplayIndex);
				SetNextFieldInGridView("move_from_rtsgt", ref currentDisplayIndex);
				SetNextFieldInGridView("qualify_from_rtsgt", ref currentDisplayIndex);
				SetNextFieldInGridView("team_id", ref currentDisplayIndex);
				SetNextFieldInGridView("num_wins", ref currentDisplayIndex);
				SetNextFieldInGridView("qualify_from_this_year", ref currentDisplayIndex);
				SetNextFieldInGridView("num_losses", ref currentDisplayIndex);
				SetNextFieldInGridView("num_draws", ref currentDisplayIndex);
				SetNextFieldInGridView("position", ref currentDisplayIndex);
				return;
			}
			if (m_CurrentTable.TableName == "sponsors")
			{
				SetNextFieldInGridView("id", ref currentDisplayIndex);
				SetNextFieldInGridView("assetid", ref currentDisplayIndex);
				SetNextFieldInGridView("domestic", ref currentDisplayIndex);
				SetNextFieldInGridView("annual", ref currentDisplayIndex);
				SetNextFieldInGridView("resign", ref currentDisplayIndex);
				SetNextFieldInGridView("league", ref currentDisplayIndex);
				SetNextFieldInGridView("extra", ref currentDisplayIndex);
				SetNextFieldInGridView("country", ref currentDisplayIndex);
				SetNextFieldInGridView("resigncondition", ref currentDisplayIndex);
				SetNextFieldInGridView("teamprestige", ref currentDisplayIndex);
				SetNextFieldInGridView("extracondition", ref currentDisplayIndex);
				return;
			}
			if (m_CurrentTable.TableName == "stadiumassignments")
			{
				SetNextFieldInGridView("teamid", ref currentDisplayIndex);
				SetNextFieldInGridView("stadiumcustomname", ref currentDisplayIndex);
				return;
			}
			if (m_CurrentTable.TableName == "standing_variations")
			{
				SetNextFieldInGridView("teamid", ref currentDisplayIndex);
				SetNextFieldInGridView("previous_pos", ref currentDisplayIndex);
				SetNextFieldInGridView("current_pos", ref currentDisplayIndex);
				return;
			}
			if (m_CurrentTable.TableName == "fanshopitems")
			{
				SetNextFieldInGridView("fanshopid", ref currentDisplayIndex);
				SetNextFieldInGridView("itemid", ref currentDisplayIndex);
				SetNextFieldInGridView("cost", ref currentDisplayIndex);
				SetNextFieldInGridView("fanshopcategoryid", ref currentDisplayIndex);
				SetNextFieldInGridView("categoryid", ref currentDisplayIndex);
				return;
			}
			if (m_CurrentTable.TableName == "manager")
			{
				SetNextFieldInGridView("teamid", ref currentDisplayIndex);
				SetNextFieldInGridView("firstname", ref currentDisplayIndex);
				SetNextFieldInGridView("surname", ref currentDisplayIndex);
				return;
			}
			if (m_CurrentTable.TableName == "MatchIntensity")
			{
				SetNextFieldInGridView("ScoreDiff", ref currentDisplayIndex);
				SetNextFieldInGridView("time15", ref currentDisplayIndex);
				SetNextFieldInGridView("time30", ref currentDisplayIndex);
				SetNextFieldInGridView("time45", ref currentDisplayIndex);
				SetNextFieldInGridView("time60", ref currentDisplayIndex);
				SetNextFieldInGridView("time75", ref currentDisplayIndex);
				SetNextFieldInGridView("time90", ref currentDisplayIndex);
				SetNextFieldInGridView("time120", ref currentDisplayIndex);
				return;
			}
			if (m_CurrentTable.TableName == "commentarynames")
			{
				SetNextFieldInGridView("commentaryid", ref currentDisplayIndex);
				SetNextFieldInGridView("commentarystring", ref currentDisplayIndex);
				SetNextFieldInGridView("commentarypreview", ref currentDisplayIndex);
				SetNextFieldInGridView("commentarystartingletter", ref currentDisplayIndex);
				return;
			}
			if (m_CurrentTable.TableName == "BigAttendance" || m_CurrentTable.TableName == "NoAttendance")
			{
				SetNextFieldInGridView("Emotion", ref currentDisplayIndex);
				SetNextFieldInGridView("Min", ref currentDisplayIndex);
				SetNextFieldInGridView("Max", ref currentDisplayIndex);
				return;
			}
			if (m_CurrentTable.TableName == "teams")
			{
				SetNextFieldInGridView("teamid", ref currentDisplayIndex);
				SetNextFieldInGridView("teamname", ref currentDisplayIndex);
				SetNextFieldInGridView("transferbudget", ref currentDisplayIndex);
				SetNextFieldInGridView("domesticprestige", ref currentDisplayIndex);
				SetNextFieldInGridView("internationalprestige", ref currentDisplayIndex);
				SetNextFieldInGridView("rivalteam", ref currentDisplayIndex);
				SetNextFieldInGridView("captainid", ref currentDisplayIndex);
				SetNextFieldInGridView("penaltytakerid", ref currentDisplayIndex);
				SetNextFieldInGridView("freekicktakerid", ref currentDisplayIndex);
				SetNextFieldInGridView("longkicktakerid", ref currentDisplayIndex);
				SetNextFieldInGridView("leftcornerkicktakerid", ref currentDisplayIndex);
				SetNextFieldInGridView("rightcornerkicktakerid", ref currentDisplayIndex);
				SetNextFieldInGridView("assetid", ref currentDisplayIndex);
				SetNextFieldInGridView("adboardid", ref currentDisplayIndex);
				SetNextFieldInGridView("balltype", ref currentDisplayIndex);
				SetNextFieldInGridView("genericbanner", ref currentDisplayIndex);
				SetNextFieldInGridView("jerseytype", ref currentDisplayIndex);
				SetNextFieldInGridView("busbuildupspeed", ref currentDisplayIndex);
				SetNextFieldInGridView("buspassing", ref currentDisplayIndex);
				SetNextFieldInGridView("buspositioning", ref currentDisplayIndex);
				SetNextFieldInGridView("cccrossing", ref currentDisplayIndex);
				SetNextFieldInGridView("ccpassing", ref currentDisplayIndex);
				SetNextFieldInGridView("ccpositioning", ref currentDisplayIndex);
				SetNextFieldInGridView("ccshooting", ref currentDisplayIndex);
				SetNextFieldInGridView("defaggression", ref currentDisplayIndex);
				SetNextFieldInGridView("defdefenderline", ref currentDisplayIndex);
				SetNextFieldInGridView("defmentality", ref currentDisplayIndex);
				SetNextFieldInGridView("defteamwidth", ref currentDisplayIndex);
				SetNextFieldInGridView("fancrowdhairskintexturecode", ref currentDisplayIndex);
				SetNextFieldInGridView("stafftracksuitcolorcode", ref currentDisplayIndex);
				SetNextFieldInGridView("physioid_primary", ref currentDisplayIndex);
				SetNextFieldInGridView("physioid_secondary", ref currentDisplayIndex);
				SetNextFieldInGridView("teamcolor1r", ref currentDisplayIndex);
				SetNextFieldInGridView("teamcolor1g", ref currentDisplayIndex);
				SetNextFieldInGridView("teamcolor1b", ref currentDisplayIndex);
				SetNextFieldInGridView("teamcolor2r", ref currentDisplayIndex);
				SetNextFieldInGridView("teamcolor2g", ref currentDisplayIndex);
				SetNextFieldInGridView("teamcolor2b", ref currentDisplayIndex);
				SetNextFieldInGridView("teamcolor3r", ref currentDisplayIndex);
				SetNextFieldInGridView("teamcolor3g", ref currentDisplayIndex);
				SetNextFieldInGridView("teamcolor3b", ref currentDisplayIndex);
				SetNextFieldInGridView("form", ref currentDisplayIndex);
				SetNextFieldInGridView("numtransfersin", ref currentDisplayIndex);
				return;
			}
			if (m_CurrentTable.TableName == "teamplayerlinks" || m_CurrentTable.TableName == "trainingteamplayerlinks")
			{
				SetNextFieldInGridView("artificialkey", ref currentDisplayIndex);
				SetNextFieldInGridView("teamid", ref currentDisplayIndex);
				SetNextFieldInGridView("playerid", ref currentDisplayIndex);
				SetNextFieldInGridView("position", ref currentDisplayIndex);
				SetNextFieldInGridView("jerseynumber", ref currentDisplayIndex);
				return;
			}
			if (m_CurrentTable.TableName == "teamkits")
			{
				SetNextFieldInGridView("teamkitid", ref currentDisplayIndex);
				SetNextFieldInGridView("teamtechid", ref currentDisplayIndex);
				SetNextFieldInGridView("teamkittypetechid", ref currentDisplayIndex);
				SetNextFieldInGridView("hasadvertisingkit", ref currentDisplayIndex);
				SetNextFieldInGridView("isinheritbasedetailmap", ref currentDisplayIndex);
				SetNextFieldInGridView("jerseyshapestyle", ref currentDisplayIndex);
				SetNextFieldInGridView("jerseycollargeometrytype", ref currentDisplayIndex);
				SetNextFieldInGridView("jerseybacknamefontcase", ref currentDisplayIndex);
				SetNextFieldInGridView("jerseybacknameplacementcode", ref currentDisplayIndex);
				SetNextFieldInGridView("jerseynamecolorr", ref currentDisplayIndex);
				SetNextFieldInGridView("jerseynamecolorg", ref currentDisplayIndex);
				SetNextFieldInGridView("jerseynamecolorb", ref currentDisplayIndex);
				SetNextFieldInGridView("jerseynamefonttype", ref currentDisplayIndex);
				SetNextFieldInGridView("jerseynamelayouttype", ref currentDisplayIndex);
				SetNextFieldInGridView("jerseyfrontnumberplacementcode", ref currentDisplayIndex);
				SetNextFieldInGridView("numberfonttype", ref currentDisplayIndex);
				SetNextFieldInGridView("numbercolor", ref currentDisplayIndex);
				SetNextFieldInGridView("jerseyrenderingdetailmaptype", ref currentDisplayIndex);
				SetNextFieldInGridView("renderingmaterialtype", ref currentDisplayIndex);
				SetNextFieldInGridView("shortsnumberplacementcode", ref currentDisplayIndex);
				SetNextFieldInGridView("shortsnumberfonttype", ref currentDisplayIndex);
				SetNextFieldInGridView("shortsnumbercolor", ref currentDisplayIndex);
				SetNextFieldInGridView("shortsrenderingdetailmaptype", ref currentDisplayIndex);
				SetNextFieldInGridView("teamcolorprimr", ref currentDisplayIndex);
				SetNextFieldInGridView("teamcolorprimg", ref currentDisplayIndex);
				SetNextFieldInGridView("teamcolorprimb", ref currentDisplayIndex);
				SetNextFieldInGridView("teamcolorsecr", ref currentDisplayIndex);
				SetNextFieldInGridView("teamcolorsecg", ref currentDisplayIndex);
				SetNextFieldInGridView("teamcolorsecb", ref currentDisplayIndex);
				SetNextFieldInGridView("teamcolortertr", ref currentDisplayIndex);
				SetNextFieldInGridView("teamcolortertg", ref currentDisplayIndex);
				SetNextFieldInGridView("teamcolortertb", ref currentDisplayIndex);
				SetNextFieldInGridView("dlc", ref currentDisplayIndex);
				SetNextFieldInGridView("year", ref currentDisplayIndex);
				return;
			}
			if (m_CurrentTable.TableName == "teamstadiumlinks")
			{
				SetNextFieldInGridView("teamid", ref currentDisplayIndex);
				SetNextFieldInGridView("stadiumid", ref currentDisplayIndex);
				return;
			}
			if (m_CurrentTable.TableName == "stadiums")
			{
				SetNextFieldInGridView("stadiumid", ref currentDisplayIndex);
				SetNextFieldInGridView("name", ref currentDisplayIndex);
				SetNextFieldInGridView("countrycode", ref currentDisplayIndex);
				SetNextFieldInGridView("hometeamid", ref currentDisplayIndex);
				SetNextFieldInGridView("capacity", ref currentDisplayIndex);
				SetNextFieldInGridView("policetypecode", ref currentDisplayIndex);
				SetNextFieldInGridView("seatcolor", ref currentDisplayIndex);
				SetNextFieldInGridView("sectionfacedbydefault", ref currentDisplayIndex);
				SetNextFieldInGridView("stadiumgoalnetstyle", ref currentDisplayIndex);
				SetNextFieldInGridView("stadiumgloalnetdepth", ref currentDisplayIndex);
				SetNextFieldInGridView("stadiumgoalnetlength", ref currentDisplayIndex);
				SetNextFieldInGridView("stadiumgoalnetwidth", ref currentDisplayIndex);
				SetNextFieldInGridView("stadiummowpattern_code", ref currentDisplayIndex);
				SetNextFieldInGridView("stadiumpitchlength", ref currentDisplayIndex);
				SetNextFieldInGridView("stadiumpitchwidth", ref currentDisplayIndex);
				SetNextFieldInGridView("adboardendlinedistance", ref currentDisplayIndex);
				SetNextFieldInGridView("adboardsidelinedistance", ref currentDisplayIndex);
				SetNextFieldInGridView("stadiumtype", ref currentDisplayIndex);
				SetNextFieldInGridView("timeofday1", ref currentDisplayIndex);
				SetNextFieldInGridView("timeofday2", ref currentDisplayIndex);
				SetNextFieldInGridView("timeofday3", ref currentDisplayIndex);
				SetNextFieldInGridView("timeofday4", ref currentDisplayIndex);
				SetNextFieldInGridView("tod1weather", ref currentDisplayIndex);
				SetNextFieldInGridView("tod2weather", ref currentDisplayIndex);
				SetNextFieldInGridView("tod3weather", ref currentDisplayIndex);
				SetNextFieldInGridView("tod4weather", ref currentDisplayIndex);
				SetNextFieldInGridView("yearbuilt", ref currentDisplayIndex);
				SetNextFieldInGridView("dlc", ref currentDisplayIndex);
				return;
			}
			if (m_CurrentTable.TableName == "referee")
			{
				SetNextFieldInGridView("refereeid", ref currentDisplayIndex);
				SetNextFieldInGridView("firstname", ref currentDisplayIndex);
				SetNextFieldInGridView("surname", ref currentDisplayIndex);
				SetNextFieldInGridView("birthdate", ref currentDisplayIndex);
				SetNextFieldInGridView("nationalitycode", ref currentDisplayIndex);
				SetNextFieldInGridView("leagueid", ref currentDisplayIndex);
				SetNextFieldInGridView("cardstrictness", ref currentDisplayIndex);
				SetNextFieldInGridView("foulstrictness", ref currentDisplayIndex);
				SetNextFieldInGridView("stylecode", ref currentDisplayIndex);
				SetNextFieldInGridView("homecitycode", ref currentDisplayIndex);
				SetNextFieldInGridView("height", ref currentDisplayIndex);
				SetNextFieldInGridView("weight", ref currentDisplayIndex);
				SetNextFieldInGridView("bodytypecode", ref currentDisplayIndex);
				SetNextFieldInGridView("shoetypecode", ref currentDisplayIndex);
				SetNextFieldInGridView("shoedesigncode", ref currentDisplayIndex);
				SetNextFieldInGridView("shoecolorcode1", ref currentDisplayIndex);
				SetNextFieldInGridView("shoecolorcode2", ref currentDisplayIndex);
				SetNextFieldInGridView("sockheightcode", ref currentDisplayIndex);
				SetNextFieldInGridView("jerseysleevelengthcode", ref currentDisplayIndex);
				SetNextFieldInGridView("eyebrowcode", ref currentDisplayIndex);
				SetNextFieldInGridView("eyecolorcode", ref currentDisplayIndex);
				SetNextFieldInGridView("facialhaircolorcode", ref currentDisplayIndex);
				SetNextFieldInGridView("facialhairtypecode", ref currentDisplayIndex);
				SetNextFieldInGridView("haircolorcode", ref currentDisplayIndex);
				SetNextFieldInGridView("haireffecttypecode", ref currentDisplayIndex);
				SetNextFieldInGridView("hairlinecode", ref currentDisplayIndex);
				SetNextFieldInGridView("hairpartcode", ref currentDisplayIndex);
				SetNextFieldInGridView("hairstateid", ref currentDisplayIndex);
				SetNextFieldInGridView("hairtypecode", ref currentDisplayIndex);
				SetNextFieldInGridView("hairvariationid", ref currentDisplayIndex);
				SetNextFieldInGridView("headclasscode", ref currentDisplayIndex);
				SetNextFieldInGridView("headtypecode", ref currentDisplayIndex);
				SetNextFieldInGridView("proxyhaircolorid", ref currentDisplayIndex);
				SetNextFieldInGridView("proxyheadclass", ref currentDisplayIndex);
				SetNextFieldInGridView("sideburnscode", ref currentDisplayIndex);
				SetNextFieldInGridView("skintonecode", ref currentDisplayIndex);
				SetNextFieldInGridView("skintypecode", ref currentDisplayIndex);
				SetNextFieldInGridView("sweatid", ref currentDisplayIndex);
				SetNextFieldInGridView("wrinkleid", ref currentDisplayIndex);
				return;
			}
			if (m_CurrentTable.TableName == "players" || m_CurrentTable.TableName == "temp_arenaplayer" || m_CurrentTable.TableName == "trainingteamplayers")
			{
				SetNextFieldInGridView("playerid", ref currentDisplayIndex);
				SetNextFieldInGridView("playerid", ref currentDisplayIndex);
				SetNextFieldInGridView("firstnameid", ref currentDisplayIndex);
				SetNextFieldInGridView("lastnameid", ref currentDisplayIndex);
				SetNextFieldInGridView("commonnameid", ref currentDisplayIndex);
				SetNextFieldInGridView("playerjerseynameid", ref currentDisplayIndex);
				SetNextFieldInGridView("birthdate", ref currentDisplayIndex);
				SetNextFieldInGridView("nationality", ref currentDisplayIndex);
				SetNextFieldInGridView("height", ref currentDisplayIndex);
				SetNextFieldInGridView("weight", ref currentDisplayIndex);
				SetNextFieldInGridView("shoetypecode", ref currentDisplayIndex);
				SetNextFieldInGridView("shoedesigncode", ref currentDisplayIndex);
				SetNextFieldInGridView("shoecolorcode1", ref currentDisplayIndex);
				SetNextFieldInGridView("shoecolorcode2", ref currentDisplayIndex);
				SetNextFieldInGridView("jerseystylecode", ref currentDisplayIndex);
				SetNextFieldInGridView("jerseyfit", ref currentDisplayIndex);
				SetNextFieldInGridView("jerseysleevelengthcode", ref currentDisplayIndex);
				SetNextFieldInGridView("shortstyle", ref currentDisplayIndex);
				SetNextFieldInGridView("socklengthcode", ref currentDisplayIndex);
				SetNextFieldInGridView("hasseasonaljersey", ref currentDisplayIndex);
				SetNextFieldInGridView("accessorycode1", ref currentDisplayIndex);
				SetNextFieldInGridView("accessorycolourcode1", ref currentDisplayIndex);
				SetNextFieldInGridView("accessorycode2", ref currentDisplayIndex);
				SetNextFieldInGridView("accessorycolourcode2", ref currentDisplayIndex);
				SetNextFieldInGridView("accessorycode3", ref currentDisplayIndex);
				SetNextFieldInGridView("accessorycolourcode3", ref currentDisplayIndex);
				SetNextFieldInGridView("accessorycode4", ref currentDisplayIndex);
				SetNextFieldInGridView("accessorycolourcode4", ref currentDisplayIndex);
				SetNextFieldInGridView("animfreekickstartposcode", ref currentDisplayIndex);
				SetNextFieldInGridView("animpenaltieskickstylecode", ref currentDisplayIndex);
				SetNextFieldInGridView("animpenaltiesmotionstylecode", ref currentDisplayIndex);
				SetNextFieldInGridView("animpenaltiesstartposcode", ref currentDisplayIndex);
				SetNextFieldInGridView("runningcode1", ref currentDisplayIndex);
				SetNextFieldInGridView("runningcode2", ref currentDisplayIndex);
				SetNextFieldInGridView("playerjointeamdate", ref currentDisplayIndex);
				SetNextFieldInGridView("contractvaliduntil", ref currentDisplayIndex);
				SetNextFieldInGridView("bodytypecode", ref currentDisplayIndex);
				SetNextFieldInGridView("headtypecode", ref currentDisplayIndex);
				SetNextFieldInGridView("hashighqualityhead", ref currentDisplayIndex);
				SetNextFieldInGridView("headclasscode", ref currentDisplayIndex);
				SetNextFieldInGridView("faceposercode", ref currentDisplayIndex);
				SetNextFieldInGridView("skintonecode", ref currentDisplayIndex);
				SetNextFieldInGridView("skintypecode", ref currentDisplayIndex);
				SetNextFieldInGridView("facialhairtypecode", ref currentDisplayIndex);
				SetNextFieldInGridView("facialhaircolorcode", ref currentDisplayIndex);
				SetNextFieldInGridView("hairtypecode", ref currentDisplayIndex);
				SetNextFieldInGridView("haircolorcode", ref currentDisplayIndex);
				SetNextFieldInGridView("sideburnscode", ref currentDisplayIndex);
				SetNextFieldInGridView("eyecolorcode", ref currentDisplayIndex);
				SetNextFieldInGridView("eyebrowcode", ref currentDisplayIndex);
				SetNextFieldInGridView("preferredposition1", ref currentDisplayIndex);
				SetNextFieldInGridView("preferredposition2", ref currentDisplayIndex);
				SetNextFieldInGridView("preferredposition3", ref currentDisplayIndex);
				SetNextFieldInGridView("preferredposition4", ref currentDisplayIndex);
				SetNextFieldInGridView("attackingworkrate", ref currentDisplayIndex);
				SetNextFieldInGridView("defensiveworkrate", ref currentDisplayIndex);
				SetNextFieldInGridView("weakfootabilitytypecode", ref currentDisplayIndex);
				SetNextFieldInGridView("internationalrep", ref currentDisplayIndex);
				SetNextFieldInGridView("isretiring", ref currentDisplayIndex);
				SetNextFieldInGridView("overallrating", ref currentDisplayIndex);
				SetNextFieldInGridView("acceleration", ref currentDisplayIndex);
				SetNextFieldInGridView("aggression", ref currentDisplayIndex);
				SetNextFieldInGridView("agility", ref currentDisplayIndex);
				SetNextFieldInGridView("balance", ref currentDisplayIndex);
				SetNextFieldInGridView("ballcontrol", ref currentDisplayIndex);
				SetNextFieldInGridView("crossing", ref currentDisplayIndex);
				SetNextFieldInGridView("curve", ref currentDisplayIndex);
				SetNextFieldInGridView("dribbling", ref currentDisplayIndex);
				SetNextFieldInGridView("finishing", ref currentDisplayIndex);
				SetNextFieldInGridView("finishingcode1", ref currentDisplayIndex);
				SetNextFieldInGridView("finishingcode2", ref currentDisplayIndex);
				SetNextFieldInGridView("freekickaccuracy", ref currentDisplayIndex);
				SetNextFieldInGridView("gkdiving", ref currentDisplayIndex);
				SetNextFieldInGridView("gkglovetypecode", ref currentDisplayIndex);
				SetNextFieldInGridView("gkhandling", ref currentDisplayIndex);
				SetNextFieldInGridView("gkkicking", ref currentDisplayIndex);
				SetNextFieldInGridView("gkkickstyle", ref currentDisplayIndex);
				SetNextFieldInGridView("gkpositioning", ref currentDisplayIndex);
				SetNextFieldInGridView("gkreflexes", ref currentDisplayIndex);
				SetNextFieldInGridView("headingaccuracy", ref currentDisplayIndex);
				SetNextFieldInGridView("interceptions", ref currentDisplayIndex);
				SetNextFieldInGridView("jumping", ref currentDisplayIndex);
				SetNextFieldInGridView("longpassing", ref currentDisplayIndex);
				SetNextFieldInGridView("longshots", ref currentDisplayIndex);
				SetNextFieldInGridView("marking", ref currentDisplayIndex);
				SetNextFieldInGridView("penalties", ref currentDisplayIndex);
				SetNextFieldInGridView("positioning", ref currentDisplayIndex);
				SetNextFieldInGridView("potential", ref currentDisplayIndex);
				SetNextFieldInGridView("preferredfoot", ref currentDisplayIndex);
				SetNextFieldInGridView("reactions", ref currentDisplayIndex);
				SetNextFieldInGridView("shortpassing", ref currentDisplayIndex);
				SetNextFieldInGridView("shotpower", ref currentDisplayIndex);
				SetNextFieldInGridView("skillmoves", ref currentDisplayIndex);
				SetNextFieldInGridView("slidingtackle", ref currentDisplayIndex);
				SetNextFieldInGridView("sprintspeed", ref currentDisplayIndex);
				SetNextFieldInGridView("stamina", ref currentDisplayIndex);
				SetNextFieldInGridView("standingtackle", ref currentDisplayIndex);
				SetNextFieldInGridView("strength", ref currentDisplayIndex);
				SetNextFieldInGridView("vision", ref currentDisplayIndex);
				SetNextFieldInGridView("volleys", ref currentDisplayIndex);
				SetNextFieldInGridView("trait1", ref currentDisplayIndex);
				SetNextFieldInGridView("trait2", ref currentDisplayIndex);
				SetNextFieldInGridView("usercaneditname", ref currentDisplayIndex);
				return;
			}
			if (m_CurrentTable.TableName == "player_grudgelove")
			{
				SetNextFieldInGridView("playerid", ref currentDisplayIndex);
				SetNextFieldInGridView("emotional_teamid", ref currentDisplayIndex);
				SetNextFieldInGridView("level_of_emotion", ref currentDisplayIndex);
				return;
			}
			if (m_CurrentTable.TableName == "managerhistory")
			{
				SetNextFieldInGridView("managerid", ref currentDisplayIndex);
				SetNextFieldInGridView("previousteamid", ref currentDisplayIndex);
				SetNextFieldInGridView("datestart", ref currentDisplayIndex);
				SetNextFieldInGridView("dateend", ref currentDisplayIndex);
				return;
			}
			if (m_CurrentTable.TableName == "playernames" || m_CurrentTable.TableName == "trainingteamplayernames")
			{
				SetNextFieldInGridView("nameid", ref currentDisplayIndex);
				SetNextFieldInGridView("name", ref currentDisplayIndex);
				SetNextFieldInGridView("commentaryid", ref currentDisplayIndex);
				return;
			}
			if (m_CurrentTable.TableName == "leagueteamlinks")
			{
				SetNextFieldInGridView("artificialkey", ref currentDisplayIndex);
				SetNextFieldInGridView("leagueid", ref currentDisplayIndex);
				SetNextFieldInGridView("teamid", ref currentDisplayIndex);
				return;
			}
			if (m_CurrentTable.TableName == "editedplayernames")
			{
				SetNextFieldInGridView("playerid", ref currentDisplayIndex);
				SetNextFieldInGridView("firstname", ref currentDisplayIndex);
				SetNextFieldInGridView("surname", ref currentDisplayIndex);
				SetNextFieldInGridView("playerjerseyname", ref currentDisplayIndex);
				SetNextFieldInGridView("commonname", ref currentDisplayIndex);
				return;
			}
			if (m_CurrentTable.TableName == "audionation")
			{
				SetNextFieldInGridView("nationid", ref currentDisplayIndex);
				SetNextFieldInGridView("ChantRegionIndex", ref currentDisplayIndex);
				return;
			}
			if (m_CurrentTable.TableName == "videos")
			{
				SetNextFieldInGridView("artificialkey", ref currentDisplayIndex);
				SetNextFieldInGridView("videoid", ref currentDisplayIndex);
				return;
			}
			if (m_CurrentTable.TableName == "scout_costs")
			{
				SetNextFieldInGridView("id", ref currentDisplayIndex);
				return;
			}
			if (m_CurrentTable.TableName == "fieldpositionboundingboxes")
			{
				SetNextFieldInGridView("positionid", ref currentDisplayIndex);
				SetNextFieldInGridView("pointx0", ref currentDisplayIndex);
				SetNextFieldInGridView("pointy0", ref currentDisplayIndex);
				SetNextFieldInGridView("pointx1", ref currentDisplayIndex);
				SetNextFieldInGridView("pointy1", ref currentDisplayIndex);
				SetNextFieldInGridView("pointx2", ref currentDisplayIndex);
				SetNextFieldInGridView("pointy2", ref currentDisplayIndex);
				SetNextFieldInGridView("pointx3", ref currentDisplayIndex);
				SetNextFieldInGridView("pointy3", ref currentDisplayIndex);
				return;
			}
			if (m_CurrentTable.TableName == "formations")
			{
				SetNextFieldInGridView("formationid", ref currentDisplayIndex);
				SetNextFieldInGridView("teamid", ref currentDisplayIndex);
				SetNextFieldInGridView("formationname", ref currentDisplayIndex);
				SetNextFieldInGridView("relativeformationid", ref currentDisplayIndex);
				SetNextFieldInGridView("issweeper", ref currentDisplayIndex);
				SetNextFieldInGridView("offensiverating", ref currentDisplayIndex);
				SetNextFieldInGridView("position0", ref currentDisplayIndex);
				SetNextFieldInGridView("position1", ref currentDisplayIndex);
				SetNextFieldInGridView("position2", ref currentDisplayIndex);
				SetNextFieldInGridView("position3", ref currentDisplayIndex);
				SetNextFieldInGridView("position4", ref currentDisplayIndex);
				SetNextFieldInGridView("position5", ref currentDisplayIndex);
				SetNextFieldInGridView("position6", ref currentDisplayIndex);
				SetNextFieldInGridView("position7", ref currentDisplayIndex);
				SetNextFieldInGridView("position8", ref currentDisplayIndex);
				SetNextFieldInGridView("position9", ref currentDisplayIndex);
				SetNextFieldInGridView("position10", ref currentDisplayIndex);
				SetNextFieldInGridView("attackingdirection_0", ref currentDisplayIndex);
				SetNextFieldInGridView("attackingdirection_1", ref currentDisplayIndex);
				SetNextFieldInGridView("attackingdirection_2", ref currentDisplayIndex);
				SetNextFieldInGridView("attackingdirection_3", ref currentDisplayIndex);
				SetNextFieldInGridView("attackingdirection_4", ref currentDisplayIndex);
				SetNextFieldInGridView("attackingdirection_5", ref currentDisplayIndex);
				SetNextFieldInGridView("attackingdirection_6", ref currentDisplayIndex);
				SetNextFieldInGridView("attackingdirection_7", ref currentDisplayIndex);
				SetNextFieldInGridView("attackingdirection_8", ref currentDisplayIndex);
				SetNextFieldInGridView("attackingdirection_9", ref currentDisplayIndex);
				SetNextFieldInGridView("attackingdirection_10", ref currentDisplayIndex);
				SetNextFieldInGridView("defensivedirection_0", ref currentDisplayIndex);
				SetNextFieldInGridView("defensivedirection_1", ref currentDisplayIndex);
				SetNextFieldInGridView("defensivedirection_2", ref currentDisplayIndex);
				SetNextFieldInGridView("defensivedirection_3", ref currentDisplayIndex);
				SetNextFieldInGridView("defensivedirection_4", ref currentDisplayIndex);
				SetNextFieldInGridView("defensivedirection_5", ref currentDisplayIndex);
				SetNextFieldInGridView("defensivedirection_6", ref currentDisplayIndex);
				SetNextFieldInGridView("defensivedirection_7", ref currentDisplayIndex);
				SetNextFieldInGridView("defensivedirection_8", ref currentDisplayIndex);
				SetNextFieldInGridView("defensivedirection_9", ref currentDisplayIndex);
				SetNextFieldInGridView("defensivedirection_10", ref currentDisplayIndex);
				SetNextFieldInGridView("attackingrole_0", ref currentDisplayIndex);
				SetNextFieldInGridView("attackingrole_1", ref currentDisplayIndex);
				SetNextFieldInGridView("attackingrole_2", ref currentDisplayIndex);
				SetNextFieldInGridView("attackingrole_3", ref currentDisplayIndex);
				SetNextFieldInGridView("attackingrole_4", ref currentDisplayIndex);
				SetNextFieldInGridView("attackingrole_5", ref currentDisplayIndex);
				SetNextFieldInGridView("attackingrole_6", ref currentDisplayIndex);
				SetNextFieldInGridView("attackingrole_7", ref currentDisplayIndex);
				SetNextFieldInGridView("attackingrole_8", ref currentDisplayIndex);
				SetNextFieldInGridView("attackingrole_9", ref currentDisplayIndex);
				SetNextFieldInGridView("attackingrole_10", ref currentDisplayIndex);
				SetNextFieldInGridView("defensiverole_0", ref currentDisplayIndex);
				SetNextFieldInGridView("defensiverole_1", ref currentDisplayIndex);
				SetNextFieldInGridView("defensiverole_2", ref currentDisplayIndex);
				SetNextFieldInGridView("defensiverole_3", ref currentDisplayIndex);
				SetNextFieldInGridView("defensiverole_4", ref currentDisplayIndex);
				SetNextFieldInGridView("defensiverole_5", ref currentDisplayIndex);
				SetNextFieldInGridView("defensiverole_6", ref currentDisplayIndex);
				SetNextFieldInGridView("defensiverole_7", ref currentDisplayIndex);
				SetNextFieldInGridView("defensiverole_8", ref currentDisplayIndex);
				SetNextFieldInGridView("defensiverole_9", ref currentDisplayIndex);
				SetNextFieldInGridView("defensiverole_10", ref currentDisplayIndex);
				SetNextFieldInGridView("offset0x", ref currentDisplayIndex);
				SetNextFieldInGridView("offset0y", ref currentDisplayIndex);
				SetNextFieldInGridView("offset1x", ref currentDisplayIndex);
				SetNextFieldInGridView("offset1y", ref currentDisplayIndex);
				SetNextFieldInGridView("offset2x", ref currentDisplayIndex);
				SetNextFieldInGridView("offset2y", ref currentDisplayIndex);
				SetNextFieldInGridView("offset3x", ref currentDisplayIndex);
				SetNextFieldInGridView("offset3y", ref currentDisplayIndex);
				SetNextFieldInGridView("offset4x", ref currentDisplayIndex);
				SetNextFieldInGridView("offset4y", ref currentDisplayIndex);
				SetNextFieldInGridView("offset5x", ref currentDisplayIndex);
				SetNextFieldInGridView("offset5y", ref currentDisplayIndex);
				SetNextFieldInGridView("offset6x", ref currentDisplayIndex);
				SetNextFieldInGridView("offset6y", ref currentDisplayIndex);
				SetNextFieldInGridView("offset7x", ref currentDisplayIndex);
				SetNextFieldInGridView("offset7y", ref currentDisplayIndex);
				SetNextFieldInGridView("offset8x", ref currentDisplayIndex);
				SetNextFieldInGridView("offset8y", ref currentDisplayIndex);
				SetNextFieldInGridView("offset9x", ref currentDisplayIndex);
				SetNextFieldInGridView("offset9y", ref currentDisplayIndex);
				SetNextFieldInGridView("offset10x", ref currentDisplayIndex);
				SetNextFieldInGridView("offset10y", ref currentDisplayIndex);
				return;
			}
			if (m_CurrentTable.TableName == "formupdate")
			{
				SetNextFieldInGridView("playerid", ref currentDisplayIndex);
				SetNextFieldInGridView("teamid", ref currentDisplayIndex);
				SetNextFieldInGridView("form", ref currentDisplayIndex);
				SetNextFieldInGridView("prevform", ref currentDisplayIndex);
				SetNextFieldInGridView("formaudio", ref currentDisplayIndex);
				SetNextFieldInGridView("leagueid", ref currentDisplayIndex);
				SetNextFieldInGridView("position", ref currentDisplayIndex);
				SetNextFieldInGridView("overallrating", ref currentDisplayIndex);
				return;
			}
			if (m_CurrentTable.TableName == "leagues")
			{
				SetNextFieldInGridView("leagueid", ref currentDisplayIndex);
				SetNextFieldInGridView("leaguename", ref currentDisplayIndex);
				SetNextFieldInGridView("countryid", ref currentDisplayIndex);
				SetNextFieldInGridView("level", ref currentDisplayIndex);
				return;
			}
			bool[] array = new bool[((BaseCollection)dataGridView.Columns).Count];
			for (int i = 0; i < ((BaseCollection)dataGridView.Columns).Count; i++)
			{
				array[i] = false;
			}
			Table table = m_FifaDbFile.GetTable(m_CurrentTable.TableName);
			currentDisplayIndex = 0;
			for (int j = 0; j < table.TableDescriptor.NKeyFields; j++)
			{
				int num = table.TableDescriptor.KeyIndex[j];
				FieldDescriptor[] fieldDescriptors = table.TableDescriptor.FieldDescriptors;
				foreach (FieldDescriptor fieldDescriptor in fieldDescriptors)
				{
					if (fieldDescriptor.FieldType == FieldDescriptor.EFieldTypes.Integer && fieldDescriptor.TypeIndex == num)
					{
						dataGridView.Columns[fieldDescriptor.FieldName].DisplayIndex = currentDisplayIndex++;
						array[((DataGridViewBand)dataGridView.Columns[fieldDescriptor.FieldName]).Index] = true;
						break;
					}
				}
			}
			FieldDescriptor[] fieldDescriptors2 = table.TableDescriptor.FieldDescriptors;
			foreach (FieldDescriptor fieldDescriptor2 in fieldDescriptors2)
			{
				if (fieldDescriptor2.FieldType == FieldDescriptor.EFieldTypes.String || fieldDescriptor2.FieldType == FieldDescriptor.EFieldTypes.ShortCompressedString || fieldDescriptor2.FieldType == FieldDescriptor.EFieldTypes.LongCompressedString)
				{
					dataGridView.Columns[fieldDescriptor2.FieldName].DisplayIndex = currentDisplayIndex++;
					array[((DataGridViewBand)dataGridView.Columns[fieldDescriptor2.FieldName]).Index] = true;
				}
			}
			while (currentDisplayIndex < table.TableDescriptor.FieldDescriptors.Length)
			{
				string text = "zzzz";
				FieldDescriptor[] fieldDescriptors3 = table.TableDescriptor.FieldDescriptors;
				foreach (FieldDescriptor fieldDescriptor3 in fieldDescriptors3)
				{
					if (!array[((DataGridViewBand)dataGridView.Columns[fieldDescriptor3.FieldName]).Index] && fieldDescriptor3.FieldName.CompareTo(text) < 0)
					{
						text = fieldDescriptor3.FieldName;
					}
				}
				dataGridView.Columns[text].DisplayIndex = currentDisplayIndex++;
				array[((DataGridViewBand)dataGridView.Columns[text]).Index] = true;
			}
		}
		catch (Exception)
		{
		}
	}

	private void SetNextFieldInGridView(string fieldName, ref int currentDisplayIndex)
	{
		if (dataGridView.Columns[fieldName] != null)
		{
			dataGridView.Columns[fieldName].DisplayIndex = currentDisplayIndex;
			currentDisplayIndex++;
		}
	}

	private void UpdateComboSearch()
	{
		comboSearch.Items.Clear();
		int count = m_CurrentTable.Columns.Count;
		if (count > 0)
		{
			for (int i = 0; i < count; i++)
			{
				comboSearch.Items.Add((object)m_CurrentTable.Columns[i].ToString());
			}
			((ListControl)comboSearch).SelectedIndex = 0;
		}
	}

	private void PrepareIntelliEdit()
	{
		if (m_IntelliEdit == null)
		{
			return;
		}
		string[] relatedKey = null;
		string[] relatedDisplay = null;
		string text = null;
		for (int i = 0; i < m_IntelliEdit.Length; i++)
		{
			if (m_IntelliEdit[i].IntermediateTableName != null && text == m_IntelliEdit[i].RelatedTableName)
			{
				m_IntelliEdit[i].RelatedKey = relatedKey;
				m_IntelliEdit[i].RelatedDisplay = relatedDisplay;
				m_IntelliEdit[i].IsValid = true;
			}
			else
			{
				m_IntelliEdit[i].Apply(m_DataSet);
			}
			text = m_IntelliEdit[i].RelatedTableName;
			relatedKey = m_IntelliEdit[i].RelatedKey;
			relatedDisplay = m_IntelliEdit[i].RelatedDisplay;
		}
	}

	private void NavigateIntelliEdit()
	{
		if (m_IntelliEdit == null)
		{
			((Control)comboIntelli).Visible = false;
			((Control)dateIntelli).Visible = false;
			((Control)comboIntelli).Text = "";
		}
		else
		{
			if (dataGridView.CurrentCell == null || ((ListControl)listBoxTables).SelectedIndex < 0)
			{
				return;
			}
			int columnIndex = dataGridView.CurrentCell.ColumnIndex;
			int rowIndex = dataGridView.CurrentCell.RowIndex;
			string tableName = m_DataSet.Tables[((ListControl)listBoxTables).SelectedIndex].TableName;
			string columnName = m_DataSet.Tables[((ListControl)listBoxTables).SelectedIndex].Columns[columnIndex].ColumnName;
			if (m_CurrentIntelliEdit != null && !m_CurrentIntelliEdit.AreYou(tableName, columnName))
			{
				m_CurrentIntelliEdit = null;
			}
			if (m_CurrentIntelliEdit == null)
			{
				for (int i = 0; i < m_IntelliEdit.Length; i++)
				{
					if (m_IntelliEdit[i].AreYou(tableName, columnName))
					{
						m_CurrentIntelliEdit = m_IntelliEdit[i];
						m_CurrentIntelliEdit.InitShow(comboIntelli, dateIntelli);
						break;
					}
				}
			}
			if (m_CurrentIntelliEdit != null)
			{
				if (!m_ChangeValueSema)
				{
					return;
				}
				m_ChangeValueSema = false;
				if (rowIndex < m_CurrentTable.Rows.Count)
				{
					string key = dataGridView.CurrentCell.Value.ToString();
					if (m_IsIntegerColumn)
					{
						m_CurrentIntelliEdit.Show(comboIntelli, dateIntelli, key, (int)numericMin.Value);
					}
					else
					{
						m_CurrentIntelliEdit.Show(comboIntelli, dateIntelli, key);
					}
				}
				else
				{
					((Control)comboIntelli).Text = "";
				}
				m_ChangeValueSema = true;
			}
			else
			{
				((Control)comboIntelli).Visible = false;
				((Control)dateIntelli).Visible = false;
				((Control)comboIntelli).Text = "";
			}
		}
	}

	private void comboSearch_SelectedIndexChanged(object sender, EventArgs e)
	{
		int selectedIndex = ((ListControl)comboSearch).SelectedIndex;
		if (selectedIndex < 0 || selectedIndex >= m_CurrentTable.Columns.Count)
		{
			return;
		}
		int selectedIndex2 = ((ListControl)listBoxTables).SelectedIndex;
		UpdateColumnInfo(selectedIndex2, selectedIndex);
		if (m_ChangeColumnSema)
		{
			m_ChangeColumnSema = false;
			if (dataGridView.CurrentCell != null)
			{
				dataGridView.CurrentCell = dataGridView[selectedIndex, dataGridView.CurrentCell.RowIndex];
			}
			m_ChangeColumnSema = true;
		}
	}

	private void UpdateColumnInfo(int tableIndex, int columnIndex)
	{
		if (tableIndex < 0)
		{
			return;
		}
		TableDescriptor tableDescriptor = m_FifaDbFile.Table[tableIndex].TableDescriptor;
		FieldDescriptor fieldDescriptor = tableDescriptor.FieldDescriptors[columnIndex];
		switch (fieldDescriptor.FieldType)
		{
		case FieldDescriptor.EFieldTypes.String:
			((Control)textType).Text = "String";
			m_IsIntegerColumn = false;
			break;
		case FieldDescriptor.EFieldTypes.Integer:
		{
			((Control)textType).Text = "Integer";
			m_IsIntegerColumn = true;
			int rangeLow = fieldDescriptor.RangeLow;
			int rangeHigh = fieldDescriptor.RangeHigh;
			int num = rangeHigh;
			int num2 = rangeHigh;
			if (rangeHigh > rangeLow)
			{
				uint num3 = (uint)(rangeHigh - rangeLow);
				int num4 = FifaUtil.ComputeBitUsed(num3);
				if (num3 < (uint)Math.Pow(2.0, num4))
				{
					num3 = (uint)Math.Pow(2.0, num4);
					num = (int)(rangeLow + num3 - 1);
					num2 = (int)(rangeLow + num3 / 2);
				}
			}
			numericMin.Minimum = rangeLow;
			numericMin.Maximum = rangeLow;
			numericMin.Value = rangeLow;
			numericMax.Minimum = num2;
			numericMax.Maximum = num;
			numericMax.Value = rangeHigh;
			break;
		}
		case FieldDescriptor.EFieldTypes.Float:
			((Control)textType).Text = "Decimal";
			m_IsIntegerColumn = false;
			break;
		case FieldDescriptor.EFieldTypes.ShortCompressedString:
			((Control)textType).Text = "String";
			m_IsIntegerColumn = false;
			break;
		case FieldDescriptor.EFieldTypes.LongCompressedString:
			((Control)textType).Text = "String";
			m_IsIntegerColumn = false;
			break;
		}
		((Control)labelMin).Visible = m_IsIntegerColumn;
		((Control)labelMax).Visible = m_IsIntegerColumn;
		((Control)numericMin).Visible = m_IsIntegerColumn;
		((Control)numericMax).Visible = m_IsIntegerColumn;
		((Control)buttonComputeHash).Visible = fieldDescriptor.FieldName == "hashid";
	}

	private void dataGridView_CurrentCellChanged(object sender, EventArgs e)
	{
		if (m_CurrentTable == null)
		{
			return;
		}
		if (m_ChangeColumnSema)
		{
			m_ChangeColumnSema = false;
			if (dataGridView.CurrentCell != null)
			{
				((Control)comboSearch).Text = m_CurrentTable.Columns[dataGridView.CurrentCell.ColumnIndex].ColumnName;
			}
			m_ChangeColumnSema = true;
		}
		NavigateIntelliEdit();
	}

	private void dataGridView_Enter(object sender, EventArgs e)
	{
		if (dataGridView.CurrentCell != null)
		{
			((Control)comboSearch).Text = m_CurrentTable.Columns[dataGridView.CurrentCell.ColumnIndex].ColumnName;
		}
		NavigateIntelliEdit();
	}

	private void menuLoadIntelli_Click(object sender, EventArgs e)
	{
		LoadIntelliEdit();
	}

	private void LoadIntelliEdit()
	{
		//IL_0055: Unknown result type (might be due to invalid IL or missing references)
		//IL_005b: Invalid comparison between Unknown and I4
		((FileDialog)openFileDialog).InitialDirectory = m_LaunchDir;
		((FileDialog)openFileDialog).FileName = "FIFA.xml";
		((FileDialog)openFileDialog).Filter = "xml files (*.xml)|*.xml";
		((FileDialog)openFileDialog).FilterIndex = 1;
		((FileDialog)openFileDialog).Title = "Open Intelli-Edit Schema";
		string text = null;
		if ((int)((CommonDialog)openFileDialog).ShowDialog() == 1)
		{
			text = ((FileDialog)openFileDialog).FileName;
		}
		if (text != null)
		{
			((ToolStripItem)statusLabel).Text = m_Localizer.GetString("Loading Intelli-Edit ...");
			((Control)this).Refresh();
			LoadXmlIntelliEdit(text);
			PrepareIntelliEdit();
			((ToolStripItem)statusLabel).Text = m_Localizer.GetString("Ready");
		}
	}

	private void LoadXmlIntelliEdit(string fileName)
	{
		m_IntelliEditSet = new DataSet();
		m_IntelliEditSet.ReadXmlSchema(m_LaunchDir + "\\IntelliEdit.xsd");
		m_IntelliEditSet.ReadXml(fileName);
		int count = m_IntelliEditSet.Tables["CrossTable"].Rows.Count;
		int count2 = m_IntelliEditSet.Tables["UseDomain"].Rows.Count;
		int count3 = m_IntelliEditSet.Tables["DomainList"].Rows.Count;
		int count4 = m_IntelliEditSet.Tables["DoubleCrossTable"].Rows.Count;
		string[] array = null;
		m_IntelliEdit = new IntelliEdit[count + count2 + count4];
		for (int i = 0; i < count; i++)
		{
			DataRow dataRow = m_IntelliEditSet.Tables["CrossTable"].Rows[i];
			m_IntelliEdit[i] = new IntelliEdit(dataRow.ItemArray[0].ToString(), dataRow.ItemArray[1].ToString(), dataRow.ItemArray[2].ToString(), dataRow.ItemArray[3].ToString(), dataRow.ItemArray[4].ToString());
		}
		for (int j = 0; j < count2; j++)
		{
			DataRow dataRow2 = m_IntelliEditSet.Tables["UseDomain"].Rows[j];
			string text = dataRow2.ItemArray[2].ToString();
			for (int k = 0; k < count3; k++)
			{
				DataRow dataRow3 = m_IntelliEditSet.Tables["DomainList"].Rows[k];
				if ((string)dataRow3.ItemArray[0] == text)
				{
					int num = (int)dataRow3.ItemArray[1];
					array = new string[num];
					for (int l = 0; l < num; l++)
					{
						array[l] = dataRow3.ItemArray[l + 2].ToString();
					}
					break;
				}
			}
			m_IntelliEdit[count + j] = new IntelliEdit(dataRow2.ItemArray[0].ToString(), dataRow2.ItemArray[1].ToString(), array);
		}
		for (int m = 0; m < count4; m++)
		{
			DataRow dataRow4 = m_IntelliEditSet.Tables["DoubleCrossTable"].Rows[m];
			m_IntelliEdit[count + count2 + m] = new IntelliEdit(dataRow4.ItemArray[0].ToString(), dataRow4.ItemArray[1].ToString(), dataRow4.ItemArray[2].ToString(), dataRow4.ItemArray[3].ToString(), dataRow4.ItemArray[4].ToString(), dataRow4.ItemArray[5].ToString(), dataRow4.ItemArray[6].ToString(), dataRow4.ItemArray[7].ToString());
		}
	}

	private void menuEnableAllMessages_Click(object sender, EventArgs e)
	{
		m_UserMessage.EnableMessages(enable: true);
	}

	private void numericMax_ValueChanged(object sender, EventArgs e)
	{
	}

	private void comboIntelli_SelectionChangeCommitted(object sender, EventArgs e)
	{
	}

	private void comboIntelli_SelectedIndexChanged(object sender, EventArgs e)
	{
		if (((ListControl)comboIntelli).SelectedIndex >= 0 && m_CurrentIntelliEdit != null && m_ChangeValueSema)
		{
			m_ChangeValueSema = false;
			object obj = null;
			obj = ((!m_IsIntegerColumn) ? m_CurrentIntelliEdit.GetRelatedKey(((ListControl)comboIntelli).SelectedIndex) : m_CurrentIntelliEdit.GetRelatedKey(((ListControl)comboIntelli).SelectedIndex, (int)numericMin.Value));
			if (obj != null)
			{
				dataGridView.CurrentCell.Value = obj;
			}
			m_ChangeValueSema = true;
		}
	}

	private void dateIntelli_ValueChanged(object sender, EventArgs e)
	{
		if (m_CurrentIntelliEdit != null && m_ChangeValueSema)
		{
			m_ChangeValueSema = false;
			DateTime value = dateIntelli.Value;
			dataGridView.CurrentCell.Value = FifaUtil.ConvertFromDate(value);
			m_ChangeValueSema = true;
		}
	}

	private void menuExportCsv_Click(object sender, EventArgs e)
	{
		//IL_005d: Unknown result type (might be due to invalid IL or missing references)
		//IL_0063: Invalid comparison between Unknown and I4
		DataTable currentTable = m_CurrentTable;
		string text = null;
		((FileDialog)saveFileDialog).InitialDirectory = m_SaveFolder;
		((FileDialog)saveFileDialog).Filter = "Text Unicode files (*.txt)|*.txt";
		((FileDialog)saveFileDialog).FilterIndex = 1;
		((FileDialog)saveFileDialog).Title = "Export table as a Text Unicode file";
		((FileDialog)saveFileDialog).FileName = currentTable.TableName;
		if ((int)((CommonDialog)saveFileDialog).ShowDialog() == 1)
		{
			text = ((FileDialog)saveFileDialog).FileName;
			m_SaveFolder = Path.GetDirectoryName(text);
			((ToolStripItem)statusLabel).Text = m_Localizer.GetString("Exporting ") + currentTable.TableName;
			((Control)this).Cursor = Cursors.WaitCursor;
			((Control)this).Refresh();
			ExportTable(currentTable, text);
			((Control)this).Cursor = Cursors.Default;
			progressBar.Value = 0;
			((ToolStripItem)statusLabel).Text = m_Localizer.GetString("Ready");
		}
	}

	private void ExportTable(DataTable t, string fileName)
	{
		StreamWriter streamWriter = new StreamWriter(fileName, append: false, m_Encoder);
		if (streamWriter == null)
		{
			return;
		}
		for (int i = 0; i < t.Columns.Count; i++)
		{
			string value = t.Columns[i].ToString();
			streamWriter.Write(value);
			if (i == t.Columns.Count - 1)
			{
				streamWriter.Write("\r\n");
			}
			else
			{
				streamWriter.Write("\t");
			}
		}
		for (int j = 0; j < t.Rows.Count; j++)
		{
			for (int k = 0; k < t.Columns.Count; k++)
			{
				string text = t.Rows[j].ItemArray[k].ToString();
				text = text.Replace("\n", "\\n");
				text = text.Replace("\r", "\\r");
				text = text.Replace("\t", "\\t");
				streamWriter.Write(text);
				if (k == t.Columns.Count - 1)
				{
					streamWriter.Write("\r\n");
				}
				else
				{
					streamWriter.Write("\t");
				}
			}
		}
		streamWriter.Close();
	}

	private void menuImportCsv_Click(object sender, EventArgs e)
	{
		//IL_005b: Unknown result type (might be due to invalid IL or missing references)
		//IL_0061: Invalid comparison between Unknown and I4
		//IL_00e0: Unknown result type (might be due to invalid IL or missing references)
		DataTable currentTable = m_CurrentTable;
		((FileDialog)openFileDialog).InitialDirectory = m_SaveFolder;
		((FileDialog)openFileDialog).FileName = currentTable.TableName;
		((FileDialog)openFileDialog).Filter = "Text Unicode files (*.txt)|*.txt";
		((FileDialog)openFileDialog).FilterIndex = 1;
		((FileDialog)openFileDialog).Title = "Import";
		if ((int)((CommonDialog)openFileDialog).ShowDialog() == 1)
		{
			string fileName = ((FileDialog)openFileDialog).FileName;
			m_SaveFolder = Path.GetDirectoryName(fileName);
			((ToolStripItem)statusLabel).Text = m_Localizer.GetString("Importing ") + fileName;
			((Control)this).Cursor = Cursors.WaitCursor;
			((Control)this).Refresh();
			if (!ImportTable(currentTable, fileName))
			{
				string messageText = "Cannot import " + Path.GetFileName(fileName) + " as " + currentTable.TableName;
				m_UserMessage.ShowMessage(5044, messageText);
			}
			((Control)this).Cursor = Cursors.Default;
			progressBar.Value = 0;
			((ToolStripItem)statusLabel).Text = m_Localizer.GetString("Ready");
		}
	}

	private bool ImportTable(DataTable t, string fileName)
	{
		StreamReader streamReader = new StreamReader(fileName, m_Encoder);
		string text = streamReader.ReadLine();
		if (text == null)
		{
			return false;
		}
		int num = 1;
		for (int i = 0; i < text.Length; i++)
		{
			if (text.Substring(i, 1) == "\t")
			{
				num++;
			}
		}
		if (num != t.Columns.Count)
		{
			streamReader.Close();
			return false;
		}
		string[] array = ReadCsv(text, num);
		for (int j = 0; j < array.Length; j++)
		{
			if (array[j] != t.Columns[j].ColumnName)
			{
				streamReader.Close();
				return false;
			}
		}
		t.Clear();
		t.BeginLoadData();
		m_ImportingTableSema = true;
		while (streamReader.Peek() != -1)
		{
			text = streamReader.ReadLine();
			string[] itemArray = ReadCsv(text, num);
			DataRow dataRow = t.NewRow();
			dataRow.ItemArray = itemArray;
			t.Rows.Add(dataRow);
		}
		t.EndLoadData();
		m_ImportingTableSema = false;
		streamReader.Close();
		return true;
	}

	private string[] ReadCsv(string line, int nTokens)
	{
		string[] array = new string[nTokens];
		int num = 0;
		string text;
		for (int i = 0; i < nTokens - 1; i++)
		{
			int num2 = line.IndexOf("\t", num);
			int length = num2 - num;
			text = line.Substring(num, length);
			num = num2 + 1;
			text = text.Replace("\\n", "\n");
			text = text.Replace("\\r", "\r");
			text = text.Replace("\\t", "\t");
			array[i] = text;
		}
		text = line.Substring(num);
		text = text.Replace("\\n", "\n");
		text = text.Replace("\\r", "\r");
		text = text.Replace("\\t", "\t");
		array[nTokens - 1] = text;
		return array;
	}

	private void menuExportAll_Click(object sender, EventArgs e)
	{
		//IL_0034: Unknown result type (might be due to invalid IL or missing references)
		//IL_0039: Unknown result type (might be due to invalid IL or missing references)
		//IL_003a: Unknown result type (might be due to invalid IL or missing references)
		//IL_003c: Invalid comparison between Unknown and I4
		folderBrowser.SelectedPath = m_SaveFolder;
		folderBrowser.ShowNewFolderButton = true;
		folderBrowser.Description = "Select the folder where to export";
		DialogResult val = ((CommonDialog)folderBrowser).ShowDialog((IWin32Window)(object)this);
		if ((int)val == 1)
		{
			m_SaveFolder = folderBrowser.SelectedPath;
			progressBar.Maximum = m_DataSet.Tables.Count;
			for (int i = 0; i < m_DataSet.Tables.Count; i++)
			{
				progressBar.Value = i;
				((ToolStripItem)statusLabel).Text = m_Localizer.GetString("Exporting ") + m_DataSet.Tables[i].TableName;
				((Control)this).Cursor = Cursors.WaitCursor;
				((Control)this).Refresh();
				string fileName = m_SaveFolder + "\\" + m_DataSet.Tables[i].TableName + ".txt";
				ExportTable(m_DataSet.Tables[i], fileName);
			}
			((Control)this).Cursor = Cursors.Default;
			progressBar.Value = 0;
			((ToolStripItem)statusLabel).Text = m_Localizer.GetString("Ready");
		}
	}

	private void menuImportAll_Click(object sender, EventArgs e)
	{
		//IL_0034: Unknown result type (might be due to invalid IL or missing references)
		//IL_0039: Unknown result type (might be due to invalid IL or missing references)
		//IL_003a: Unknown result type (might be due to invalid IL or missing references)
		//IL_003c: Invalid comparison between Unknown and I4
		folderBrowser.ShowNewFolderButton = true;
		folderBrowser.SelectedPath = m_SaveFolder;
		folderBrowser.Description = "Select the folder from which to import";
		DialogResult val = ((CommonDialog)folderBrowser).ShowDialog((IWin32Window)(object)this);
		if ((int)val != 1)
		{
			return;
		}
		m_SaveFolder = folderBrowser.SelectedPath;
		string[] files = Directory.GetFiles(m_SaveFolder, "*.txt");
		DataTable dataTable = null;
		progressBar.Maximum = files.Length;
		for (int i = 0; i < files.Length; i++)
		{
			progressBar.Value = i;
			string fileNameWithoutExtension = Path.GetFileNameWithoutExtension(files[i]);
			dataTable = m_DataSet.Tables[fileNameWithoutExtension];
			if (dataTable != null)
			{
				((ToolStripItem)statusLabel).Text = m_Localizer.GetString("Importing ") + fileNameWithoutExtension;
				((Control)this).Cursor = Cursors.WaitCursor;
				((Control)this).Refresh();
				ImportTable(dataTable, files[i]);
			}
			else
			{
				((ToolStripItem)statusLabel).Text = m_Localizer.GetString("Cannot Import ") + fileNameWithoutExtension;
			}
		}
		((Control)this).Cursor = Cursors.Default;
		progressBar.Value = 0;
		((ToolStripItem)statusLabel).Text = m_Localizer.GetString("Ready");
	}

	private void DbMaster_FormClosing(object sender, FormClosingEventArgs e)
	{
	}

	private void menuCopy_Click(object sender, EventArgs e)
	{
		//IL_002b: Unknown result type (might be due to invalid IL or missing references)
		DataGridView val = null;
		DataTable dataTable = null;
		val = dataGridView;
		dataTable = m_CurrentTable;
		if (((BaseCollection)val.SelectedRows).Count <= 0)
		{
			m_UserMessage.ShowMessage(5048);
			return;
		}
		m_CopiedTableName = dataTable.TableName;
		m_CopiedRecords = new DataRow[((BaseCollection)val.SelectedRows).Count];
		m_ImportingTableSema = true;
		for (int i = 0; i < ((BaseCollection)val.SelectedRows).Count; i++)
		{
			DataGridViewRow val2 = val.SelectedRows[i];
			DataRow dataRow = dataTable.NewRow();
			for (int j = 0; j < ((BaseCollection)val2.Cells).Count; j++)
			{
				dataRow[j] = val2.Cells[j].Value;
			}
			m_CopiedRecords[i] = dataRow;
		}
		m_ImportingTableSema = false;
	}

	private void menuPaste_Click(object sender, EventArgs e)
	{
		if (CanPaste())
		{
			PasteRecords();
		}
	}

	private bool CanPaste()
	{
		//IL_001d: Unknown result type (might be due to invalid IL or missing references)
		//IL_0048: Unknown result type (might be due to invalid IL or missing references)
		if (m_CopiedRecords == null || m_CopiedRecords.Length == 0)
		{
			m_UserMessage.ShowMessage(5046);
			return false;
		}
		if (m_CopiedTableName != m_CurrentTable.TableName)
		{
			m_UserMessage.ShowMessage(5047);
			return false;
		}
		return true;
	}

	private bool CanDelete()
	{
		//IL_001e: Unknown result type (might be due to invalid IL or missing references)
		if (((BaseCollection)dataGridView.SelectedRows).Count <= 0)
		{
			m_UserMessage.ShowMessage(5045);
			return false;
		}
		return true;
	}

	private void PasteRecords()
	{
		m_ImportingTableSema = true;
		for (int i = 0; i < m_CopiedRecords.Length; i++)
		{
			DataRow dataRow = m_CurrentTable.NewRow();
			dataRow.ItemArray = m_CopiedRecords[i].ItemArray;
			m_CurrentTable.Rows.Add(dataRow);
		}
		m_ImportingTableSema = false;
	}

	private void DeleteRecords()
	{
		//IL_0020: Unknown result type (might be due to invalid IL or missing references)
		//IL_0026: Expected O, but got Unknown
		m_ImportingTableSema = true;
		foreach (DataGridViewRow item in (BaseCollection)dataGridView.SelectedRows)
		{
			DataGridViewRow val = item;
			dataGridView.Rows.Remove(val);
		}
		m_ImportingTableSema = false;
	}

	private void menuReplace_Click(object sender, EventArgs e)
	{
		if (CanPaste() && CanDelete())
		{
			DeleteRecords();
			PasteRecords();
		}
	}

	private void menuDelete_Click(object sender, EventArgs e)
	{
		if (CanDelete())
		{
			DeleteRecords();
		}
	}

	private void menuCount_Click(object sender, EventArgs e)
	{
		//IL_002f: Unknown result type (might be due to invalid IL or missing references)
		string messageText = "Record counter = " + m_CurrentTable.Rows.Count;
		m_UserMessage.ShowMessage(20000, messageText);
	}

	private void menuFind_Click(object sender, EventArgs e)
	{
		FindNext(checkExactly: false);
	}

	private void toolStripButton1_Click(object sender, EventArgs e)
	{
		FindNext(checkExactly: false);
	}

	private void buttonFindExactly_Click(object sender, EventArgs e)
	{
		FindNext(checkExactly: true);
	}

	private void FindNext(bool checkExactly)
	{
		//IL_0030: Unknown result type (might be due to invalid IL or missing references)
		//IL_007f: Unknown result type (might be due to invalid IL or missing references)
		//IL_0151: Unknown result type (might be due to invalid IL or missing references)
		if (((ToolStripItem)textSearch).Text == "" || ((ListControl)comboSearch).SelectedIndex < 0)
		{
			m_UserMessage.ShowMessage(1013);
			return;
		}
		string text = ((ToolStripItem)textSearch).Text.ToString();
		string text2 = text.ToLower();
		int selectedIndex = ((ListControl)comboSearch).SelectedIndex;
		int count = m_CurrentTable.Rows.Count;
		if (count == 0)
		{
			m_UserMessage.ShowMessage(20000, "No record available in this table");
			return;
		}
		int index = ((DataGridViewBand)dataGridView.CurrentRow).Index;
		int num = index + 1;
		if (num == count)
		{
			num = 0;
		}
		bool flag = false;
		while (true)
		{
			m_CurrentTable.Rows[num].ItemArray[selectedIndex].ToString();
			string text3 = dataGridView[selectedIndex, num].Value.ToString();
			string text4 = text3.ToLower();
			if (text4 == text2 || (text4.IndexOf(text2) >= 0 && !checkExactly))
			{
				dataGridView.CurrentCell = dataGridView[selectedIndex, num];
				flag = true;
				break;
			}
			if (num == index)
			{
				break;
			}
			num++;
			if (num == count)
			{
				num = 0;
			}
		}
		if (!flag)
		{
			m_UserMessage.ShowMessage(20000, "Not found");
		}
	}

	private void textSearch_KeyDown(object sender, KeyEventArgs e)
	{
		if (e.KeyValue == 13)
		{
			((ToolStripItem)buttonFind).PerformClick();
		}
	}

	private void menuSort_Click(object sender, EventArgs e)
	{
		//IL_0082: Unknown result type (might be due to invalid IL or missing references)
		//IL_0088: Expected O, but got Unknown
		//IL_003f: Unknown result type (might be due to invalid IL or missing references)
		//IL_0045: Expected O, but got Unknown
		menuSort.Checked = !menuSort.Checked;
		if (menuSort.Checked)
		{
			foreach (DataGridViewColumn item in (BaseCollection)dataGridView.Columns)
			{
				DataGridViewColumn val = item;
				val.SortMode = (DataGridViewColumnSortMode)1;
			}
			return;
		}
		foreach (DataGridViewColumn item2 in (BaseCollection)dataGridView.Columns)
		{
			DataGridViewColumn val2 = item2;
			val2.SortMode = (DataGridViewColumnSortMode)0;
		}
	}

	private void buttonExportSingle_Click(object sender, EventArgs e)
	{
		menuExportCsv_Click(null, null);
	}

	private void buttonExportMulti_Click(object sender, EventArgs e)
	{
		menuExportAll_Click(null, null);
	}

	private void buttonImportSingle_Click(object sender, EventArgs e)
	{
		menuImportCsv_Click(null, null);
	}

	private void buttonImportMulti_Click(object sender, EventArgs e)
	{
		menuImportAll_Click(null, null);
	}

	private void buttonRecordCopy_Click(object sender, EventArgs e)
	{
		menuCopy_Click(null, null);
	}

	private void buttonRecordcInsert_Click(object sender, EventArgs e)
	{
		menuPaste_Click(null, null);
	}

	private void buttonRecordcReplace_Click(object sender, EventArgs e)
	{
		menuReplace_Click(null, null);
	}

	private void buttonRecordcDelete_Click(object sender, EventArgs e)
	{
		menuDelete_Click(null, null);
	}

	private void buttonRecordcCount_Click(object sender, EventArgs e)
	{
		menuCount_Click(null, null);
	}

	private void menuHelpFile_Click(object sender, EventArgs e)
	{
		string text = m_LaunchDir + "\\DbMaster.htm";
		if (File.Exists(text))
		{
			Help.ShowHelp((Control)(object)this, text);
		}
	}

	private void menuAbout_Click(object sender, EventArgs e)
	{
		//IL_0006: Unknown result type (might be due to invalid IL or missing references)
		((Form)m_AboutForm).ShowDialog();
	}

	private void buttonOpen_Click(object sender, EventArgs e)
	{
		OpenXmlAndDb();
	}

	private void buttonSave_Click(object sender, EventArgs e)
	{
		if (m_IsDbFileOpen)
		{
			SaveDb();
			SaveXml();
		}
	}

	private void buttonClose_Click(object sender, EventArgs e)
	{
		if (AskAndSave())
		{
			CloseDb();
		}
	}

	private void buttonIntelliEdit_Click(object sender, EventArgs e)
	{
		LoadIntelliEdit();
	}

	private void expandFifadbToolStripMenuItem_Click(object sender, EventArgs e)
	{
		//IL_0021: Unknown result type (might be due to invalid IL or missing references)
		bool flag = m_FifaDbFile.Expand();
		m_UserMessage.ShowMessage(flag ? 1010 : 1011);
	}

	private void diagnosticToolStripMenuItem_Click(object sender, EventArgs e)
	{
	}

	private void mainDatabaseToolStripMenuItem_Click(object sender, EventArgs e)
	{
		if (ExtractMainDbFromBig("\\Game\\patch.big", "\\Game\\patch.bh"))
		{
			HideMainDbInBig("\\Game\\data0.big", "\\Game\\data0.bh");
		}
		else
		{
			ExtractMainDbFromBig("\\Game\\data0.big", "\\Game\\data0.bh");
		}
	}

	private bool ExtractMainDbFromBig(string bigFileName, string bhFileName)
	{
		string exportDir = m_InstallDir + "\\Game";
		BhFile bhFile = new BhFile(bhFileName);
		if (bhFile == null)
		{
			return false;
		}
		string fileName = "data/db/fifa_ng_db.db";
		int archivedFileIndex = bhFile.GetArchivedFileIndex(fileName);
		string fileName2 = "data/db/fifa_ng_db-meta.xml";
		int archivedFileIndex2 = bhFile.GetArchivedFileIndex(fileName2);
		if (archivedFileIndex != -1 || archivedFileIndex2 != -1)
		{
			FifaBigFile fifaBigFile = new FifaBigFile(bigFileName);
			if (fifaBigFile == null)
			{
				return false;
			}
			if (archivedFileIndex != -1)
			{
				fifaBigFile.Export(fileName, exportDir);
				bhFile.Hide(archivedFileIndex);
			}
			if (archivedFileIndex2 != -1)
			{
				fifaBigFile.Export(fileName2, exportDir);
				bhFile.Hide(archivedFileIndex2);
			}
			bhFile.Save();
			((ToolStripItem)statusLabel).Text = m_Localizer.GetString("Database extracted and hidden in the BIG File.");
			return true;
		}
		((ToolStripItem)statusLabel).Text = m_Localizer.GetString("Database not present in the BIG File.");
		return false;
	}

	private bool HideMainDbInBig(string bigFileName, string bhFileName)
	{
		_ = m_InstallDir + "\\Game";
		BhFile bhFile = new BhFile(bhFileName);
		if (bhFile == null)
		{
			return false;
		}
		string fileName = "data/db/fifa_ng_db.db";
		int archivedFileIndex = bhFile.GetArchivedFileIndex(fileName);
		string fileName2 = "data/db/fifa_ng_db-meta.xml";
		int archivedFileIndex2 = bhFile.GetArchivedFileIndex(fileName2);
		if (archivedFileIndex != -1 || archivedFileIndex2 != -1)
		{
			FifaBigFile fifaBigFile = new FifaBigFile(bigFileName);
			if (fifaBigFile == null)
			{
				return false;
			}
			if (archivedFileIndex != -1)
			{
				bhFile.Hide(archivedFileIndex);
			}
			if (archivedFileIndex2 != -1)
			{
				bhFile.Hide(archivedFileIndex2);
			}
			bhFile.Save();
			return true;
		}
		return false;
	}

	private void localDatabasesToolStripMenuItem_Click(object sender, EventArgs e)
	{
		string fileName = m_InstallDir + "\\Game\\data\\loc\\locale.big";
		string exportDir = m_InstallDir + "\\Game";
		FifaBigFile fifaBigFile = new FifaBigFile(fileName);
		string[] archivedFileNames = fifaBigFile.GetArchivedFileNames("*.db", useFullPath: true);
		string[] archivedFileNames2 = fifaBigFile.GetArchivedFileNames("*.xml", useFullPath: true);
		bool flag = fifaBigFile.Export(archivedFileNames, exportDir);
		if (flag)
		{
			fifaBigFile.Delete(archivedFileNames);
		}
		bool flag2 = fifaBigFile.Export(archivedFileNames2, exportDir);
		if (flag2)
		{
			fifaBigFile.Delete(archivedFileNames2);
		}
		if (flag || flag2)
		{
			fifaBigFile.Save();
			((ToolStripItem)statusLabel).Text = m_Localizer.GetString("Database extracted and hidden in the BIG File.");
		}
		else
		{
			((ToolStripItem)statusLabel).Text = m_Localizer.GetString("Database not present in the BIG File.");
		}
	}

	private void buttonComputeHash_Click(object sender, EventArgs e)
	{
		CalculateAllHash();
	}

	private void calculateHashidToolStripMenuItem_Click(object sender, EventArgs e)
	{
		CalculateAllHash();
	}

	private void CalculateAllHash()
	{
		if (m_CurrentTable.Columns[1].ColumnName == "hashid" && m_CurrentTable.Columns[2].ColumnName == "stringid")
		{
			((Control)this).Cursor = Cursors.WaitCursor;
			for (int i = 0; i < m_CurrentTable.Rows.Count; i++)
			{
				string name = (string)dataGridView.Rows[i].Cells[2].Value;
				uint num = FifaUtil.ComputeLanguageHash(name);
				int num2 = (int)num;
				dataGridView.Rows[i].Cells[1].Value = num2;
			}
			((Control)this).Cursor = Cursors.Default;
		}
	}

	protected override void Dispose(bool disposing)
	{
		if (disposing && components != null)
		{
			components.Dispose();
		}
		((Form)this).Dispose(disposing);
	}

	private void InitializeComponent()
	{
		//IL_001b: Unknown result type (might be due to invalid IL or missing references)
		//IL_0021: Expected O, but got Unknown
		//IL_0021: Unknown result type (might be due to invalid IL or missing references)
		//IL_0027: Expected O, but got Unknown
		//IL_0027: Unknown result type (might be due to invalid IL or missing references)
		//IL_002d: Expected O, but got Unknown
		//IL_002e: Unknown result type (might be due to invalid IL or missing references)
		//IL_0038: Expected O, but got Unknown
		//IL_0039: Unknown result type (might be due to invalid IL or missing references)
		//IL_0043: Expected O, but got Unknown
		//IL_0044: Unknown result type (might be due to invalid IL or missing references)
		//IL_004e: Expected O, but got Unknown
		//IL_004f: Unknown result type (might be due to invalid IL or missing references)
		//IL_0059: Expected O, but got Unknown
		//IL_005a: Unknown result type (might be due to invalid IL or missing references)
		//IL_0064: Expected O, but got Unknown
		//IL_0065: Unknown result type (might be due to invalid IL or missing references)
		//IL_006f: Expected O, but got Unknown
		//IL_0070: Unknown result type (might be due to invalid IL or missing references)
		//IL_007a: Expected O, but got Unknown
		//IL_007b: Unknown result type (might be due to invalid IL or missing references)
		//IL_0085: Expected O, but got Unknown
		//IL_0086: Unknown result type (might be due to invalid IL or missing references)
		//IL_0090: Expected O, but got Unknown
		//IL_0091: Unknown result type (might be due to invalid IL or missing references)
		//IL_009b: Expected O, but got Unknown
		//IL_009c: Unknown result type (might be due to invalid IL or missing references)
		//IL_00a6: Expected O, but got Unknown
		//IL_00a7: Unknown result type (might be due to invalid IL or missing references)
		//IL_00b1: Expected O, but got Unknown
		//IL_00b2: Unknown result type (might be due to invalid IL or missing references)
		//IL_00bc: Expected O, but got Unknown
		//IL_00bd: Unknown result type (might be due to invalid IL or missing references)
		//IL_00c7: Expected O, but got Unknown
		//IL_00c8: Unknown result type (might be due to invalid IL or missing references)
		//IL_00d2: Expected O, but got Unknown
		//IL_00d3: Unknown result type (might be due to invalid IL or missing references)
		//IL_00dd: Expected O, but got Unknown
		//IL_00de: Unknown result type (might be due to invalid IL or missing references)
		//IL_00e8: Expected O, but got Unknown
		//IL_00e9: Unknown result type (might be due to invalid IL or missing references)
		//IL_00f3: Expected O, but got Unknown
		//IL_00f4: Unknown result type (might be due to invalid IL or missing references)
		//IL_00fe: Expected O, but got Unknown
		//IL_00ff: Unknown result type (might be due to invalid IL or missing references)
		//IL_0109: Expected O, but got Unknown
		//IL_010a: Unknown result type (might be due to invalid IL or missing references)
		//IL_0114: Expected O, but got Unknown
		//IL_0115: Unknown result type (might be due to invalid IL or missing references)
		//IL_011f: Expected O, but got Unknown
		//IL_0120: Unknown result type (might be due to invalid IL or missing references)
		//IL_012a: Expected O, but got Unknown
		//IL_012b: Unknown result type (might be due to invalid IL or missing references)
		//IL_0135: Expected O, but got Unknown
		//IL_0136: Unknown result type (might be due to invalid IL or missing references)
		//IL_0140: Expected O, but got Unknown
		//IL_0141: Unknown result type (might be due to invalid IL or missing references)
		//IL_014b: Expected O, but got Unknown
		//IL_014c: Unknown result type (might be due to invalid IL or missing references)
		//IL_0156: Expected O, but got Unknown
		//IL_0157: Unknown result type (might be due to invalid IL or missing references)
		//IL_0161: Expected O, but got Unknown
		//IL_0162: Unknown result type (might be due to invalid IL or missing references)
		//IL_016c: Expected O, but got Unknown
		//IL_016d: Unknown result type (might be due to invalid IL or missing references)
		//IL_0177: Expected O, but got Unknown
		//IL_0178: Unknown result type (might be due to invalid IL or missing references)
		//IL_0182: Expected O, but got Unknown
		//IL_0183: Unknown result type (might be due to invalid IL or missing references)
		//IL_018d: Expected O, but got Unknown
		//IL_018e: Unknown result type (might be due to invalid IL or missing references)
		//IL_0198: Expected O, but got Unknown
		//IL_0199: Unknown result type (might be due to invalid IL or missing references)
		//IL_01a3: Expected O, but got Unknown
		//IL_01a4: Unknown result type (might be due to invalid IL or missing references)
		//IL_01ae: Expected O, but got Unknown
		//IL_01af: Unknown result type (might be due to invalid IL or missing references)
		//IL_01b9: Expected O, but got Unknown
		//IL_01ba: Unknown result type (might be due to invalid IL or missing references)
		//IL_01c4: Expected O, but got Unknown
		//IL_01c5: Unknown result type (might be due to invalid IL or missing references)
		//IL_01cf: Expected O, but got Unknown
		//IL_01d0: Unknown result type (might be due to invalid IL or missing references)
		//IL_01da: Expected O, but got Unknown
		//IL_01db: Unknown result type (might be due to invalid IL or missing references)
		//IL_01e5: Expected O, but got Unknown
		//IL_01e6: Unknown result type (might be due to invalid IL or missing references)
		//IL_01f0: Expected O, but got Unknown
		//IL_01f1: Unknown result type (might be due to invalid IL or missing references)
		//IL_01fb: Expected O, but got Unknown
		//IL_01fc: Unknown result type (might be due to invalid IL or missing references)
		//IL_0206: Expected O, but got Unknown
		//IL_0207: Unknown result type (might be due to invalid IL or missing references)
		//IL_0211: Expected O, but got Unknown
		//IL_0212: Unknown result type (might be due to invalid IL or missing references)
		//IL_021c: Expected O, but got Unknown
		//IL_021d: Unknown result type (might be due to invalid IL or missing references)
		//IL_0227: Expected O, but got Unknown
		//IL_0228: Unknown result type (might be due to invalid IL or missing references)
		//IL_0232: Expected O, but got Unknown
		//IL_0233: Unknown result type (might be due to invalid IL or missing references)
		//IL_023d: Expected O, but got Unknown
		//IL_023e: Unknown result type (might be due to invalid IL or missing references)
		//IL_0248: Expected O, but got Unknown
		//IL_0249: Unknown result type (might be due to invalid IL or missing references)
		//IL_0253: Expected O, but got Unknown
		//IL_0254: Unknown result type (might be due to invalid IL or missing references)
		//IL_025e: Expected O, but got Unknown
		//IL_025f: Unknown result type (might be due to invalid IL or missing references)
		//IL_0269: Expected O, but got Unknown
		//IL_026a: Unknown result type (might be due to invalid IL or missing references)
		//IL_0274: Expected O, but got Unknown
		//IL_0275: Unknown result type (might be due to invalid IL or missing references)
		//IL_027f: Expected O, but got Unknown
		//IL_0280: Unknown result type (might be due to invalid IL or missing references)
		//IL_028a: Expected O, but got Unknown
		//IL_028b: Unknown result type (might be due to invalid IL or missing references)
		//IL_0295: Expected O, but got Unknown
		//IL_0296: Unknown result type (might be due to invalid IL or missing references)
		//IL_02a0: Expected O, but got Unknown
		//IL_02a1: Unknown result type (might be due to invalid IL or missing references)
		//IL_02ab: Expected O, but got Unknown
		//IL_02ac: Unknown result type (might be due to invalid IL or missing references)
		//IL_02b6: Expected O, but got Unknown
		//IL_02b7: Unknown result type (might be due to invalid IL or missing references)
		//IL_02c1: Expected O, but got Unknown
		//IL_02c2: Unknown result type (might be due to invalid IL or missing references)
		//IL_02cc: Expected O, but got Unknown
		//IL_02cd: Unknown result type (might be due to invalid IL or missing references)
		//IL_02d7: Expected O, but got Unknown
		//IL_02d8: Unknown result type (might be due to invalid IL or missing references)
		//IL_02e2: Expected O, but got Unknown
		//IL_02e3: Unknown result type (might be due to invalid IL or missing references)
		//IL_02ed: Expected O, but got Unknown
		//IL_02ee: Unknown result type (might be due to invalid IL or missing references)
		//IL_02f8: Expected O, but got Unknown
		//IL_02f9: Unknown result type (might be due to invalid IL or missing references)
		//IL_0303: Expected O, but got Unknown
		//IL_0304: Unknown result type (might be due to invalid IL or missing references)
		//IL_030e: Expected O, but got Unknown
		//IL_030f: Unknown result type (might be due to invalid IL or missing references)
		//IL_0319: Expected O, but got Unknown
		//IL_031a: Unknown result type (might be due to invalid IL or missing references)
		//IL_0324: Expected O, but got Unknown
		//IL_0325: Unknown result type (might be due to invalid IL or missing references)
		//IL_032f: Expected O, but got Unknown
		//IL_0330: Unknown result type (might be due to invalid IL or missing references)
		//IL_033a: Expected O, but got Unknown
		//IL_0341: Unknown result type (might be due to invalid IL or missing references)
		//IL_034b: Expected O, but got Unknown
		//IL_03e5: Unknown result type (might be due to invalid IL or missing references)
		//IL_03ef: Expected O, but got Unknown
		//IL_052d: Unknown result type (might be due to invalid IL or missing references)
		//IL_0537: Expected O, but got Unknown
		//IL_05b2: Unknown result type (might be due to invalid IL or missing references)
		//IL_05bc: Expected O, but got Unknown
		//IL_0637: Unknown result type (might be due to invalid IL or missing references)
		//IL_0641: Expected O, but got Unknown
		//IL_06b0: Unknown result type (might be due to invalid IL or missing references)
		//IL_06ba: Expected O, but got Unknown
		//IL_0757: Unknown result type (might be due to invalid IL or missing references)
		//IL_0761: Expected O, but got Unknown
		//IL_08d7: Unknown result type (might be due to invalid IL or missing references)
		//IL_08e1: Expected O, but got Unknown
		//IL_0950: Unknown result type (might be due to invalid IL or missing references)
		//IL_095a: Expected O, but got Unknown
		//IL_09c9: Unknown result type (might be due to invalid IL or missing references)
		//IL_09d3: Expected O, but got Unknown
		//IL_0a42: Unknown result type (might be due to invalid IL or missing references)
		//IL_0a4c: Expected O, but got Unknown
		//IL_0b51: Unknown result type (might be due to invalid IL or missing references)
		//IL_0b5b: Expected O, but got Unknown
		//IL_0bd7: Unknown result type (might be due to invalid IL or missing references)
		//IL_0be1: Expected O, but got Unknown
		//IL_0c5d: Unknown result type (might be due to invalid IL or missing references)
		//IL_0c67: Expected O, but got Unknown
		//IL_0ce3: Unknown result type (might be due to invalid IL or missing references)
		//IL_0ced: Expected O, but got Unknown
		//IL_0d6c: Unknown result type (might be due to invalid IL or missing references)
		//IL_0d76: Expected O, but got Unknown
		//IL_0ef7: Unknown result type (might be due to invalid IL or missing references)
		//IL_0f01: Expected O, but got Unknown
		//IL_0f70: Unknown result type (might be due to invalid IL or missing references)
		//IL_0f7a: Expected O, but got Unknown
		//IL_0ff6: Unknown result type (might be due to invalid IL or missing references)
		//IL_1000: Expected O, but got Unknown
		//IL_1058: Unknown result type (might be due to invalid IL or missing references)
		//IL_1062: Expected O, but got Unknown
		//IL_10d1: Unknown result type (might be due to invalid IL or missing references)
		//IL_10db: Expected O, but got Unknown
		//IL_114a: Unknown result type (might be due to invalid IL or missing references)
		//IL_1154: Expected O, but got Unknown
		//IL_11cf: Unknown result type (might be due to invalid IL or missing references)
		//IL_11d9: Expected O, but got Unknown
		//IL_12aa: Unknown result type (might be due to invalid IL or missing references)
		//IL_12b4: Expected O, but got Unknown
		//IL_1320: Unknown result type (might be due to invalid IL or missing references)
		//IL_132a: Expected O, but got Unknown
		//IL_13a6: Unknown result type (might be due to invalid IL or missing references)
		//IL_13b0: Expected O, but got Unknown
		//IL_14d5: Unknown result type (might be due to invalid IL or missing references)
		//IL_14df: Expected O, but got Unknown
		//IL_1bb2: Unknown result type (might be due to invalid IL or missing references)
		//IL_1bbc: Expected O, but got Unknown
		//IL_1c1d: Unknown result type (might be due to invalid IL or missing references)
		//IL_1c27: Expected O, but got Unknown
		//IL_1cab: Unknown result type (might be due to invalid IL or missing references)
		//IL_1cb5: Expected O, but got Unknown
		//IL_1d4e: Unknown result type (might be due to invalid IL or missing references)
		//IL_1d58: Expected O, but got Unknown
		//IL_1ec6: Unknown result type (might be due to invalid IL or missing references)
		//IL_1ed0: Expected O, but got Unknown
		//IL_1f58: Unknown result type (might be due to invalid IL or missing references)
		//IL_1f62: Expected O, but got Unknown
		//IL_1fea: Unknown result type (might be due to invalid IL or missing references)
		//IL_1ff4: Expected O, but got Unknown
		//IL_209f: Unknown result type (might be due to invalid IL or missing references)
		//IL_20a9: Expected O, but got Unknown
		//IL_2131: Unknown result type (might be due to invalid IL or missing references)
		//IL_213b: Expected O, but got Unknown
		//IL_21c3: Unknown result type (might be due to invalid IL or missing references)
		//IL_21cd: Expected O, but got Unknown
		//IL_2255: Unknown result type (might be due to invalid IL or missing references)
		//IL_225f: Expected O, but got Unknown
		//IL_22e7: Unknown result type (might be due to invalid IL or missing references)
		//IL_22f1: Expected O, but got Unknown
		//IL_238c: Unknown result type (might be due to invalid IL or missing references)
		//IL_2396: Expected O, but got Unknown
		//IL_241e: Unknown result type (might be due to invalid IL or missing references)
		//IL_2428: Expected O, but got Unknown
		//IL_24b0: Unknown result type (might be due to invalid IL or missing references)
		//IL_24ba: Expected O, but got Unknown
		//IL_2542: Unknown result type (might be due to invalid IL or missing references)
		//IL_254c: Expected O, but got Unknown
		//IL_25d4: Unknown result type (might be due to invalid IL or missing references)
		//IL_25de: Expected O, but got Unknown
		//IL_2689: Unknown result type (might be due to invalid IL or missing references)
		//IL_2693: Expected O, but got Unknown
		//IL_270b: Unknown result type (might be due to invalid IL or missing references)
		//IL_2715: Expected O, but got Unknown
		//IL_27b4: Unknown result type (might be due to invalid IL or missing references)
		//IL_27be: Expected O, but got Unknown
		//IL_2809: Unknown result type (might be due to invalid IL or missing references)
		//IL_2813: Expected O, but got Unknown
		//IL_287f: Unknown result type (might be due to invalid IL or missing references)
		//IL_2889: Expected O, but got Unknown
		//IL_28b3: Unknown result type (might be due to invalid IL or missing references)
		//IL_28bd: Expected O, but got Unknown
		components = new Container();
		ComponentResourceManager componentResourceManager = new ComponentResourceManager(typeof(DbMaster));
		DataGridViewCellStyle val = new DataGridViewCellStyle();
		DataGridViewCellStyle val2 = new DataGridViewCellStyle();
		DataGridViewCellStyle val3 = new DataGridViewCellStyle();
		mainMenu = new MenuStrip();
		menuFile = new ToolStripMenuItem();
		menuOpen = new ToolStripMenuItem();
		menuSave = new ToolStripMenuItem();
		menuClose = new ToolStripMenuItem();
		menuExit = new ToolStripMenuItem();
		extractFromBigToolStripMenuItem = new ToolStripMenuItem();
		mainDatabaseToolStripMenuItem = new ToolStripMenuItem();
		localDatabasesToolStripMenuItem = new ToolStripMenuItem();
		menuTable = new ToolStripMenuItem();
		menuExportCsv = new ToolStripMenuItem();
		menuImportCsv = new ToolStripMenuItem();
		menuExportAll = new ToolStripMenuItem();
		menuImportAll = new ToolStripMenuItem();
		menuRecord = new ToolStripMenuItem();
		menuCopy = new ToolStripMenuItem();
		menuPaste = new ToolStripMenuItem();
		menuReplace = new ToolStripMenuItem();
		menuDelete = new ToolStripMenuItem();
		menuCount = new ToolStripMenuItem();
		menuSort = new ToolStripMenuItem();
		menuTools = new ToolStripMenuItem();
		menuLoadIntelli = new ToolStripMenuItem();
		menuFind = new ToolStripMenuItem();
		findExactlyToolStripMenuItem = new ToolStripMenuItem();
		menuEnableAllMessages = new ToolStripMenuItem();
		expandFifadbToolStripMenuItem = new ToolStripMenuItem();
		diagnosticToolStripMenuItem = new ToolStripMenuItem();
		calculateHashidToolStripMenuItem = new ToolStripMenuItem();
		menuHelp = new ToolStripMenuItem();
		menuHelpFile = new ToolStripMenuItem();
		menuAbout = new ToolStripMenuItem();
		statusStrip = new StatusStrip();
		progressBar = new ToolStripProgressBar();
		statusLabel = new ToolStripStatusLabel();
		panelTop = new Panel();
		buttonComputeHash = new Button();
		dateIntelli = new DateTimePicker();
		textType = new TextBox();
		labelMax = new Label();
		numericMax = new NumericUpDown();
		numericMin = new NumericUpDown();
		labelMin = new Label();
		comboSearch = new ComboBox();
		comboIntelli = new ComboBox();
		splitContainer1 = new SplitContainer();
		listBoxTables = new ListBox();
		dataGridView = new DataGridView();
		toolStrip = new ToolStrip();
		buttonOpen = new ToolStripButton();
		buttonSave = new ToolStripButton();
		buttonClose = new ToolStripButton();
		toolStripSeparator1 = new ToolStripSeparator();
		buttonExportSingle = new ToolStripButton();
		buttonExportMulti = new ToolStripButton();
		buttonImportSingle = new ToolStripButton();
		buttonImportMulti = new ToolStripButton();
		buttonIntelliEdit = new ToolStripButton();
		toolStripSeparator2 = new ToolStripSeparator();
		buttonRecordCopy = new ToolStripButton();
		buttonRecordcInsert = new ToolStripButton();
		buttonRecordcReplace = new ToolStripButton();
		buttonRecordcDelete = new ToolStripButton();
		buttonRecordcCount = new ToolStripButton();
		toolStripSeparator3 = new ToolStripSeparator();
		buttonFindExactly = new ToolStripButton();
		buttonFind = new ToolStripButton();
		textSearch = new ToolStripTextBox();
		openFileDialog = new OpenFileDialog();
		saveFileDialog = new SaveFileDialog();
		folderBrowser = new FolderBrowserDialog();
		contextMenuCell = new ContextMenuStrip(components);
		((Control)mainMenu).SuspendLayout();
		((Control)statusStrip).SuspendLayout();
		((Control)panelTop).SuspendLayout();
		((ISupportInitialize)numericMax).BeginInit();
		((ISupportInitialize)numericMin).BeginInit();
		((ISupportInitialize)splitContainer1).BeginInit();
		((Control)splitContainer1.Panel1).SuspendLayout();
		((Control)splitContainer1.Panel2).SuspendLayout();
		((Control)splitContainer1).SuspendLayout();
		((ISupportInitialize)dataGridView).BeginInit();
		((Control)toolStrip).SuspendLayout();
		((Control)this).SuspendLayout();
		((Control)mainMenu).BackgroundImage = (Image)componentResourceManager.GetObject("mainMenu.BackgroundImage");
		((Control)mainMenu).BackgroundImageLayout = (ImageLayout)3;
		((ToolStrip)mainMenu).Items.AddRange((ToolStripItem[])(object)new ToolStripItem[5]
		{
			(ToolStripItem)menuFile,
			(ToolStripItem)menuTable,
			(ToolStripItem)menuRecord,
			(ToolStripItem)menuTools,
			(ToolStripItem)menuHelp
		});
		((Control)mainMenu).Location = new Point(0, 0);
		((Control)mainMenu).Name = "mainMenu";
		((Control)mainMenu).Size = new Size(985, 24);
		((Control)mainMenu).TabIndex = 0;
		((Control)mainMenu).Text = "mainMenu";
		((ToolStripDropDownItem)menuFile).DropDownItems.AddRange((ToolStripItem[])(object)new ToolStripItem[5]
		{
			(ToolStripItem)menuOpen,
			(ToolStripItem)menuSave,
			(ToolStripItem)menuClose,
			(ToolStripItem)menuExit,
			(ToolStripItem)extractFromBigToolStripMenuItem
		});
		((ToolStripItem)menuFile).Name = "menuFile";
		((ToolStripItem)menuFile).Size = new Size(37, 20);
		((ToolStripItem)menuFile).Text = "File";
		((ToolStripItem)menuOpen).Image = (Image)componentResourceManager.GetObject("menuOpen.Image");
		((ToolStripItem)menuOpen).ImageTransparentColor = Color.Fuchsia;
		((ToolStripItem)menuOpen).Name = "menuOpen";
		((ToolStripItem)menuOpen).Size = new Size(162, 22);
		((ToolStripItem)menuOpen).Text = "Open DB";
		((ToolStripItem)menuOpen).Click += menuOpen_Click;
		((ToolStripItem)menuSave).Enabled = false;
		((ToolStripItem)menuSave).Image = (Image)componentResourceManager.GetObject("menuSave.Image");
		((ToolStripItem)menuSave).ImageTransparentColor = Color.Fuchsia;
		((ToolStripItem)menuSave).Name = "menuSave";
		((ToolStripItem)menuSave).Size = new Size(162, 22);
		((ToolStripItem)menuSave).Text = "Save";
		((ToolStripItem)menuSave).Click += menuSave_Click;
		((ToolStripItem)menuClose).Enabled = false;
		((ToolStripItem)menuClose).Image = (Image)componentResourceManager.GetObject("menuClose.Image");
		((ToolStripItem)menuClose).ImageTransparentColor = Color.Fuchsia;
		((ToolStripItem)menuClose).Name = "menuClose";
		((ToolStripItem)menuClose).Size = new Size(162, 22);
		((ToolStripItem)menuClose).Text = "Close";
		((ToolStripItem)menuClose).Click += menuClose_Click;
		((ToolStripItem)menuExit).Image = (Image)componentResourceManager.GetObject("menuExit.Image");
		((ToolStripItem)menuExit).ImageTransparentColor = Color.Fuchsia;
		((ToolStripItem)menuExit).Name = "menuExit";
		((ToolStripItem)menuExit).Size = new Size(162, 22);
		((ToolStripItem)menuExit).Text = "Exit";
		((ToolStripItem)menuExit).Click += menuExit_Click;
		((ToolStripDropDownItem)extractFromBigToolStripMenuItem).DropDownItems.AddRange((ToolStripItem[])(object)new ToolStripItem[2]
		{
			(ToolStripItem)mainDatabaseToolStripMenuItem,
			(ToolStripItem)localDatabasesToolStripMenuItem
		});
		((ToolStripItem)extractFromBigToolStripMenuItem).Image = (Image)componentResourceManager.GetObject("extractFromBigToolStripMenuItem.Image");
		((ToolStripItem)extractFromBigToolStripMenuItem).ImageTransparentColor = Color.Fuchsia;
		((ToolStripItem)extractFromBigToolStripMenuItem).Name = "extractFromBigToolStripMenuItem";
		((ToolStripItem)extractFromBigToolStripMenuItem).Size = new Size(162, 22);
		((ToolStripItem)extractFromBigToolStripMenuItem).Text = "Extract from .BIG";
		((ToolStripItem)mainDatabaseToolStripMenuItem).Name = "mainDatabaseToolStripMenuItem";
		((ToolStripItem)mainDatabaseToolStripMenuItem).Size = new Size(157, 22);
		((ToolStripItem)mainDatabaseToolStripMenuItem).Text = "Main database";
		((ToolStripItem)mainDatabaseToolStripMenuItem).Click += mainDatabaseToolStripMenuItem_Click;
		((ToolStripItem)localDatabasesToolStripMenuItem).Name = "localDatabasesToolStripMenuItem";
		((ToolStripItem)localDatabasesToolStripMenuItem).Size = new Size(157, 22);
		((ToolStripItem)localDatabasesToolStripMenuItem).Text = "Local databases";
		((ToolStripItem)localDatabasesToolStripMenuItem).Click += localDatabasesToolStripMenuItem_Click;
		((ToolStripDropDownItem)menuTable).DropDownItems.AddRange((ToolStripItem[])(object)new ToolStripItem[4]
		{
			(ToolStripItem)menuExportCsv,
			(ToolStripItem)menuImportCsv,
			(ToolStripItem)menuExportAll,
			(ToolStripItem)menuImportAll
		});
		((ToolStripItem)menuTable).Enabled = false;
		((ToolStripItem)menuTable).Name = "menuTable";
		((ToolStripItem)menuTable).Size = new Size(48, 20);
		((ToolStripItem)menuTable).Text = "Table";
		((ToolStripItem)menuExportCsv).Image = (Image)componentResourceManager.GetObject("menuExportCsv.Image");
		((ToolStripItem)menuExportCsv).ImageTransparentColor = Color.Fuchsia;
		((ToolStripItem)menuExportCsv).Name = "menuExportCsv";
		((ToolStripItem)menuExportCsv).Size = new Size(152, 22);
		((ToolStripItem)menuExportCsv).Text = "Export Single";
		((ToolStripItem)menuExportCsv).Click += menuExportCsv_Click;
		((ToolStripItem)menuImportCsv).Image = (Image)componentResourceManager.GetObject("menuImportCsv.Image");
		((ToolStripItem)menuImportCsv).ImageTransparentColor = Color.Fuchsia;
		((ToolStripItem)menuImportCsv).Name = "menuImportCsv";
		((ToolStripItem)menuImportCsv).Size = new Size(152, 22);
		((ToolStripItem)menuImportCsv).Text = "Import Single";
		((ToolStripItem)menuImportCsv).Click += menuImportCsv_Click;
		((ToolStripItem)menuExportAll).Image = (Image)componentResourceManager.GetObject("menuExportAll.Image");
		((ToolStripItem)menuExportAll).ImageTransparentColor = Color.Fuchsia;
		((ToolStripItem)menuExportAll).Name = "menuExportAll";
		((ToolStripItem)menuExportAll).Size = new Size(152, 22);
		((ToolStripItem)menuExportAll).Text = "Export All";
		((ToolStripItem)menuExportAll).Click += menuExportAll_Click;
		((ToolStripItem)menuImportAll).Image = (Image)componentResourceManager.GetObject("menuImportAll.Image");
		((ToolStripItem)menuImportAll).ImageTransparentColor = Color.Fuchsia;
		((ToolStripItem)menuImportAll).Name = "menuImportAll";
		((ToolStripItem)menuImportAll).Size = new Size(152, 22);
		((ToolStripItem)menuImportAll).Text = "Import All";
		((ToolStripItem)menuImportAll).Click += menuImportAll_Click;
		((ToolStripDropDownItem)menuRecord).DropDownItems.AddRange((ToolStripItem[])(object)new ToolStripItem[6]
		{
			(ToolStripItem)menuCopy,
			(ToolStripItem)menuPaste,
			(ToolStripItem)menuReplace,
			(ToolStripItem)menuDelete,
			(ToolStripItem)menuCount,
			(ToolStripItem)menuSort
		});
		((ToolStripItem)menuRecord).Enabled = false;
		((ToolStripItem)menuRecord).Name = "menuRecord";
		((ToolStripItem)menuRecord).Size = new Size(56, 20);
		((ToolStripItem)menuRecord).Text = "Record";
		((ToolStripItem)menuCopy).Image = (Image)componentResourceManager.GetObject("menuCopy.Image");
		((ToolStripItem)menuCopy).ImageTransparentColor = Color.Fuchsia;
		((ToolStripItem)menuCopy).Name = "menuCopy";
		menuCopy.ShortcutKeys = (Keys)115;
		((ToolStripItem)menuCopy).Size = new Size(152, 22);
		((ToolStripItem)menuCopy).Text = "Copy";
		((ToolStripItem)menuCopy).Click += menuCopy_Click;
		((ToolStripItem)menuPaste).Image = (Image)componentResourceManager.GetObject("menuPaste.Image");
		((ToolStripItem)menuPaste).ImageTransparentColor = Color.Fuchsia;
		((ToolStripItem)menuPaste).Name = "menuPaste";
		menuPaste.ShortcutKeys = (Keys)116;
		((ToolStripItem)menuPaste).Size = new Size(152, 22);
		((ToolStripItem)menuPaste).Text = "Insert";
		((ToolStripItem)menuPaste).Click += menuPaste_Click;
		((ToolStripItem)menuReplace).Image = (Image)componentResourceManager.GetObject("menuReplace.Image");
		((ToolStripItem)menuReplace).ImageTransparentColor = Color.Fuchsia;
		((ToolStripItem)menuReplace).Name = "menuReplace";
		menuReplace.ShortcutKeys = (Keys)117;
		((ToolStripItem)menuReplace).Size = new Size(152, 22);
		((ToolStripItem)menuReplace).Text = "Replace";
		((ToolStripItem)menuReplace).Click += menuReplace_Click;
		((ToolStripItem)menuDelete).Image = (Image)componentResourceManager.GetObject("menuDelete.Image");
		((ToolStripItem)menuDelete).ImageTransparentColor = Color.Fuchsia;
		((ToolStripItem)menuDelete).Name = "menuDelete";
		menuDelete.ShortcutKeys = (Keys)131140;
		((ToolStripItem)menuDelete).Size = new Size(152, 22);
		((ToolStripItem)menuDelete).Text = "Delete";
		((ToolStripItem)menuDelete).Click += menuDelete_Click;
		((ToolStripItem)menuCount).Image = (Image)componentResourceManager.GetObject("menuCount.Image");
		((ToolStripItem)menuCount).ImageTransparentColor = Color.Fuchsia;
		((ToolStripItem)menuCount).Name = "menuCount";
		((ToolStripItem)menuCount).Size = new Size(152, 22);
		((ToolStripItem)menuCount).Text = "Count";
		((ToolStripItem)menuCount).Click += menuCount_Click;
		menuSort.Checked = true;
		menuSort.CheckState = (CheckState)1;
		((ToolStripItem)menuSort).Name = "menuSort";
		((ToolStripItem)menuSort).Size = new Size(152, 22);
		((ToolStripItem)menuSort).Text = "Sort";
		((ToolStripItem)menuSort).Visible = false;
		((ToolStripItem)menuSort).Click += menuSort_Click;
		((ToolStripDropDownItem)menuTools).DropDownItems.AddRange((ToolStripItem[])(object)new ToolStripItem[7]
		{
			(ToolStripItem)menuLoadIntelli,
			(ToolStripItem)menuFind,
			(ToolStripItem)findExactlyToolStripMenuItem,
			(ToolStripItem)menuEnableAllMessages,
			(ToolStripItem)expandFifadbToolStripMenuItem,
			(ToolStripItem)diagnosticToolStripMenuItem,
			(ToolStripItem)calculateHashidToolStripMenuItem
		});
		((ToolStripItem)menuTools).Enabled = false;
		((ToolStripItem)menuTools).Name = "menuTools";
		((ToolStripItem)menuTools).Size = new Size(48, 20);
		((ToolStripItem)menuTools).Text = "Tools";
		((ToolStripItem)menuLoadIntelli).Image = (Image)componentResourceManager.GetObject("menuLoadIntelli.Image");
		((ToolStripItem)menuLoadIntelli).ImageTransparentColor = Color.Fuchsia;
		((ToolStripItem)menuLoadIntelli).Name = "menuLoadIntelli";
		((ToolStripItem)menuLoadIntelli).Size = new Size(202, 22);
		((ToolStripItem)menuLoadIntelli).Text = "Load Intelli-Edit Schema";
		((ToolStripItem)menuLoadIntelli).Click += menuLoadIntelli_Click;
		((ToolStripItem)menuFind).Image = (Image)componentResourceManager.GetObject("menuFind.Image");
		((ToolStripItem)menuFind).ImageTransparentColor = Color.Fuchsia;
		((ToolStripItem)menuFind).Name = "menuFind";
		menuFind.ShortcutKeys = (Keys)114;
		((ToolStripItem)menuFind).Size = new Size(202, 22);
		((ToolStripItem)menuFind).Text = "Find";
		((ToolStripItem)menuFind).Click += menuFind_Click;
		((ToolStripItem)findExactlyToolStripMenuItem).Image = (Image)componentResourceManager.GetObject("findExactlyToolStripMenuItem.Image");
		((ToolStripItem)findExactlyToolStripMenuItem).ImageTransparentColor = Color.Fuchsia;
		((ToolStripItem)findExactlyToolStripMenuItem).Name = "findExactlyToolStripMenuItem";
		((ToolStripItem)findExactlyToolStripMenuItem).Size = new Size(202, 22);
		((ToolStripItem)findExactlyToolStripMenuItem).Text = "Find Exactly";
		((ToolStripItem)menuEnableAllMessages).Image = (Image)componentResourceManager.GetObject("menuEnableAllMessages.Image");
		((ToolStripItem)menuEnableAllMessages).ImageTransparentColor = Color.Fuchsia;
		((ToolStripItem)menuEnableAllMessages).Name = "menuEnableAllMessages";
		((ToolStripItem)menuEnableAllMessages).Size = new Size(202, 22);
		((ToolStripItem)menuEnableAllMessages).Text = "Enable All Messages";
		((ToolStripItem)menuEnableAllMessages).Click += menuEnableAllMessages_Click;
		((ToolStripItem)expandFifadbToolStripMenuItem).Image = (Image)componentResourceManager.GetObject("expandFifadbToolStripMenuItem.Image");
		((ToolStripItem)expandFifadbToolStripMenuItem).ImageTransparentColor = Color.Fuchsia;
		((ToolStripItem)expandFifadbToolStripMenuItem).Name = "expandFifadbToolStripMenuItem";
		((ToolStripItem)expandFifadbToolStripMenuItem).Size = new Size(202, 22);
		((ToolStripItem)expandFifadbToolStripMenuItem).Text = "Expand FIFA Database";
		((ToolStripItem)expandFifadbToolStripMenuItem).Click += expandFifadbToolStripMenuItem_Click;
		((ToolStripItem)diagnosticToolStripMenuItem).Image = (Image)componentResourceManager.GetObject("diagnosticToolStripMenuItem.Image");
		((ToolStripItem)diagnosticToolStripMenuItem).ImageTransparentColor = Color.Fuchsia;
		((ToolStripItem)diagnosticToolStripMenuItem).Name = "diagnosticToolStripMenuItem";
		((ToolStripItem)diagnosticToolStripMenuItem).Size = new Size(202, 22);
		((ToolStripItem)diagnosticToolStripMenuItem).Text = "Diagnostic";
		((ToolStripItem)diagnosticToolStripMenuItem).Visible = false;
		((ToolStripItem)diagnosticToolStripMenuItem).Click += diagnosticToolStripMenuItem_Click;
		((ToolStripItem)calculateHashidToolStripMenuItem).Image = (Image)componentResourceManager.GetObject("calculateHashidToolStripMenuItem.Image");
		((ToolStripItem)calculateHashidToolStripMenuItem).ImageTransparentColor = Color.Fuchsia;
		((ToolStripItem)calculateHashidToolStripMenuItem).Name = "calculateHashidToolStripMenuItem";
		((ToolStripItem)calculateHashidToolStripMenuItem).Size = new Size(202, 22);
		((ToolStripItem)calculateHashidToolStripMenuItem).Text = "Calculate All Hash";
		((ToolStripItem)calculateHashidToolStripMenuItem).Click += calculateHashidToolStripMenuItem_Click;
		((ToolStripDropDownItem)menuHelp).DropDownItems.AddRange((ToolStripItem[])(object)new ToolStripItem[2]
		{
			(ToolStripItem)menuHelpFile,
			(ToolStripItem)menuAbout
		});
		((ToolStripItem)menuHelp).Name = "menuHelp";
		((ToolStripItem)menuHelp).Size = new Size(44, 20);
		((ToolStripItem)menuHelp).Text = "Help";
		((ToolStripItem)menuHelpFile).Image = (Image)componentResourceManager.GetObject("menuHelpFile.Image");
		((ToolStripItem)menuHelpFile).ImageTransparentColor = Color.Fuchsia;
		((ToolStripItem)menuHelpFile).Name = "menuHelpFile";
		((ToolStripItem)menuHelpFile).Size = new Size(107, 22);
		((ToolStripItem)menuHelpFile).Text = "Help";
		((ToolStripItem)menuHelpFile).Click += menuHelpFile_Click;
		((ToolStripItem)menuAbout).Image = (Image)componentResourceManager.GetObject("menuAbout.Image");
		((ToolStripItem)menuAbout).ImageTransparentColor = Color.Fuchsia;
		((ToolStripItem)menuAbout).Name = "menuAbout";
		((ToolStripItem)menuAbout).Size = new Size(107, 22);
		((ToolStripItem)menuAbout).Text = "About";
		((ToolStripItem)menuAbout).Click += menuAbout_Click;
		((ToolStrip)statusStrip).BackColor = SystemColors.InactiveCaptionText;
		((Control)statusStrip).BackgroundImage = (Image)componentResourceManager.GetObject("statusStrip.BackgroundImage");
		((Control)statusStrip).BackgroundImageLayout = (ImageLayout)3;
		((ToolStrip)statusStrip).Items.AddRange((ToolStripItem[])(object)new ToolStripItem[2]
		{
			(ToolStripItem)progressBar,
			(ToolStripItem)statusLabel
		});
		((Control)statusStrip).Location = new Point(0, 559);
		((Control)statusStrip).Name = "statusStrip";
		((Control)statusStrip).Size = new Size(985, 22);
		((Control)statusStrip).TabIndex = 1;
		((Control)statusStrip).Text = "statusStrip";
		((ToolStripItem)progressBar).Name = "progressBar";
		((ToolStripItem)progressBar).Size = new Size(120, 16);
		progressBar.Style = (ProgressBarStyle)1;
		((ToolStripItem)statusLabel).BackColor = Color.Transparent;
		((ToolStripItem)statusLabel).Name = "statusLabel";
		((ToolStripItem)statusLabel).Size = new Size(39, 17);
		((ToolStripItem)statusLabel).Text = "Ready";
		((ToolStripItem)statusLabel).TextAlign = (ContentAlignment)16;
		((Control)panelTop).BackgroundImage = (Image)componentResourceManager.GetObject("panelTop.BackgroundImage");
		((Control)panelTop).BackgroundImageLayout = (ImageLayout)3;
		((Control)panelTop).Controls.Add((Control)(object)buttonComputeHash);
		((Control)panelTop).Controls.Add((Control)(object)dateIntelli);
		((Control)panelTop).Controls.Add((Control)(object)textType);
		((Control)panelTop).Controls.Add((Control)(object)labelMax);
		((Control)panelTop).Controls.Add((Control)(object)numericMax);
		((Control)panelTop).Controls.Add((Control)(object)numericMin);
		((Control)panelTop).Controls.Add((Control)(object)labelMin);
		((Control)panelTop).Controls.Add((Control)(object)comboSearch);
		((Control)panelTop).Controls.Add((Control)(object)comboIntelli);
		((Control)panelTop).Dock = (DockStyle)1;
		((Control)panelTop).Enabled = false;
		((Control)panelTop).Location = new Point(0, 0);
		((Control)panelTop).Name = "panelTop";
		((Control)panelTop).Size = new Size(798, 26);
		((Control)panelTop).TabIndex = 1;
		((Control)buttonComputeHash).Location = new Point(477, 1);
		((Control)buttonComputeHash).Name = "buttonComputeHash";
		((Control)buttonComputeHash).Size = new Size(75, 23);
		((Control)buttonComputeHash).TabIndex = 12;
		((Control)buttonComputeHash).Text = "HASH";
		((ButtonBase)buttonComputeHash).UseVisualStyleBackColor = true;
		((Control)buttonComputeHash).Visible = false;
		((Control)buttonComputeHash).Click += buttonComputeHash_Click;
		dateIntelli.Format = (DateTimePickerFormat)2;
		((Control)dateIntelli).Location = new Point(558, 2);
		((Control)dateIntelli).Name = "dateIntelli";
		((Control)dateIntelli).Size = new Size(152, 20);
		((Control)dateIntelli).TabIndex = 11;
		dateIntelli.Value = new DateTime(1985, 1, 1, 0, 0, 0, 0);
		((Control)dateIntelli).Visible = false;
		dateIntelli.ValueChanged += dateIntelli_ValueChanged;
		((Control)textType).BackColor = Color.White;
		((Control)textType).Location = new Point(160, 3);
		((Control)textType).Name = "textType";
		((TextBoxBase)textType).ReadOnly = true;
		((Control)textType).Size = new Size(81, 20);
		((Control)textType).TabIndex = 10;
		((Control)labelMax).BackColor = Color.Transparent;
		((Control)labelMax).Location = new Point(364, 5);
		((Control)labelMax).Name = "labelMax";
		((Control)labelMax).Size = new Size(32, 16);
		((Control)labelMax).TabIndex = 4;
		((Control)labelMax).Text = "max";
		labelMax.TextAlign = (ContentAlignment)16;
		((Control)numericMax).Location = new Point(399, 3);
		((Control)numericMax).Name = "numericMax";
		((Control)numericMax).Size = new Size(72, 20);
		((Control)numericMax).TabIndex = 3;
		((UpDownBase)numericMax).TextAlign = (HorizontalAlignment)2;
		numericMax.ValueChanged += numericMax_ValueChanged;
		((Control)numericMin).Location = new Point(277, 3);
		((Control)numericMin).Name = "numericMin";
		((Control)numericMin).Size = new Size(72, 20);
		((Control)numericMin).TabIndex = 1;
		((UpDownBase)numericMin).TextAlign = (HorizontalAlignment)2;
		((Control)labelMin).BackColor = Color.Transparent;
		((Control)labelMin).Location = new Point(247, 5);
		((Control)labelMin).Name = "labelMin";
		((Control)labelMin).Size = new Size(24, 16);
		((Control)labelMin).TabIndex = 2;
		((Control)labelMin).Text = "min";
		labelMin.TextAlign = (ContentAlignment)16;
		((ListControl)comboSearch).FormattingEnabled = true;
		((Control)comboSearch).Location = new Point(3, 2);
		((Control)comboSearch).Name = "comboSearch";
		((Control)comboSearch).Size = new Size(152, 21);
		((Control)comboSearch).TabIndex = 0;
		comboSearch.SelectedIndexChanged += comboSearch_SelectedIndexChanged;
		((Control)comboIntelli).Location = new Point(558, 2);
		comboIntelli.MaxDropDownItems = 12;
		((Control)comboIntelli).Name = "comboIntelli";
		((Control)comboIntelli).Size = new Size(172, 21);
		((Control)comboIntelli).TabIndex = 1;
		((Control)comboIntelli).Visible = false;
		comboIntelli.SelectedIndexChanged += comboIntelli_SelectedIndexChanged;
		comboIntelli.SelectionChangeCommitted += comboIntelli_SelectionChangeCommitted;
		((Control)splitContainer1).BackColor = Color.Gold;
		splitContainer1.Dock = (DockStyle)5;
		((Control)splitContainer1).Location = new Point(0, 49);
		((Control)splitContainer1).Name = "splitContainer1";
		((Control)splitContainer1.Panel1).Controls.Add((Control)(object)listBoxTables);
		((Control)splitContainer1.Panel2).Controls.Add((Control)(object)dataGridView);
		((Control)splitContainer1.Panel2).Controls.Add((Control)(object)panelTop);
		((Control)splitContainer1).Size = new Size(985, 510);
		splitContainer1.SplitterDistance = 185;
		splitContainer1.SplitterWidth = 2;
		((Control)splitContainer1).TabIndex = 2;
		listBoxTables.BorderStyle = (BorderStyle)1;
		((Control)listBoxTables).Dock = (DockStyle)5;
		((ListControl)listBoxTables).FormattingEnabled = true;
		((Control)listBoxTables).Location = new Point(0, 0);
		((Control)listBoxTables).Name = "listBoxTables";
		((Control)listBoxTables).Size = new Size(185, 510);
		((Control)listBoxTables).TabIndex = 0;
		listBoxTables.SelectedIndexChanged += listBox_SelectedIndexChanged;
		dataGridView.AllowUserToOrderColumns = true;
		dataGridView.ClipboardCopyMode = (DataGridViewClipboardCopyMode)2;
		val.Alignment = (DataGridViewContentAlignment)16;
		val.BackColor = SystemColors.Control;
		val.Font = new Font("Microsoft Sans Serif", 8.25f, (FontStyle)0, (GraphicsUnit)3, (byte)0);
		val.ForeColor = SystemColors.WindowText;
		val.SelectionBackColor = SystemColors.Highlight;
		val.SelectionForeColor = SystemColors.HighlightText;
		val.WrapMode = (DataGridViewTriState)1;
		dataGridView.ColumnHeadersDefaultCellStyle = val;
		dataGridView.ColumnHeadersHeightSizeMode = (DataGridViewColumnHeadersHeightSizeMode)2;
		val2.Alignment = (DataGridViewContentAlignment)16;
		val2.BackColor = SystemColors.Window;
		val2.Font = new Font("Microsoft Sans Serif", 8.25f, (FontStyle)0, (GraphicsUnit)3, (byte)0);
		val2.ForeColor = SystemColors.ControlText;
		val2.SelectionBackColor = SystemColors.Highlight;
		val2.SelectionForeColor = SystemColors.HighlightText;
		val2.WrapMode = (DataGridViewTriState)2;
		dataGridView.DefaultCellStyle = val2;
		((Control)dataGridView).Dock = (DockStyle)5;
		((Control)dataGridView).Location = new Point(0, 26);
		((Control)dataGridView).Name = "dataGridView";
		val3.Alignment = (DataGridViewContentAlignment)16;
		val3.BackColor = SystemColors.Control;
		val3.Font = new Font("Microsoft Sans Serif", 8.25f, (FontStyle)0, (GraphicsUnit)3, (byte)0);
		val3.ForeColor = SystemColors.WindowText;
		val3.SelectionBackColor = SystemColors.Highlight;
		val3.SelectionForeColor = SystemColors.HighlightText;
		val3.WrapMode = (DataGridViewTriState)1;
		dataGridView.RowHeadersDefaultCellStyle = val3;
		((Control)dataGridView).Size = new Size(798, 484);
		((Control)dataGridView).TabIndex = 1;
		dataGridView.CurrentCellChanged += dataGridView_CurrentCellChanged;
		((Control)dataGridView).Enter += dataGridView_Enter;
		((Control)toolStrip).BackgroundImage = (Image)componentResourceManager.GetObject("toolStrip.BackgroundImage");
		((Control)toolStrip).BackgroundImageLayout = (ImageLayout)3;
		toolStrip.GripStyle = (ToolStripGripStyle)0;
		toolStrip.Items.AddRange((ToolStripItem[])(object)new ToolStripItem[19]
		{
			(ToolStripItem)buttonOpen,
			(ToolStripItem)buttonSave,
			(ToolStripItem)buttonClose,
			(ToolStripItem)toolStripSeparator1,
			(ToolStripItem)buttonExportSingle,
			(ToolStripItem)buttonExportMulti,
			(ToolStripItem)buttonImportSingle,
			(ToolStripItem)buttonImportMulti,
			(ToolStripItem)buttonIntelliEdit,
			(ToolStripItem)toolStripSeparator2,
			(ToolStripItem)buttonRecordCopy,
			(ToolStripItem)buttonRecordcInsert,
			(ToolStripItem)buttonRecordcReplace,
			(ToolStripItem)buttonRecordcDelete,
			(ToolStripItem)buttonRecordcCount,
			(ToolStripItem)toolStripSeparator3,
			(ToolStripItem)buttonFindExactly,
			(ToolStripItem)buttonFind,
			(ToolStripItem)textSearch
		});
		((Control)toolStrip).Location = new Point(0, 24);
		((Control)toolStrip).Name = "toolStrip";
		((Control)toolStrip).Size = new Size(985, 25);
		((Control)toolStrip).TabIndex = 0;
		((Control)toolStrip).Text = "toolStrip";
		((ToolStripItem)buttonOpen).DisplayStyle = (ToolStripItemDisplayStyle)2;
		((ToolStripItem)buttonOpen).Image = (Image)componentResourceManager.GetObject("buttonOpen.Image");
		((ToolStripItem)buttonOpen).ImageTransparentColor = Color.Magenta;
		((ToolStripItem)buttonOpen).Name = "buttonOpen";
		((ToolStripItem)buttonOpen).Size = new Size(23, 22);
		((ToolStripItem)buttonOpen).Text = "toolStripButton13";
		((ToolStripItem)buttonOpen).ToolTipText = "Open DB file";
		((ToolStripItem)buttonOpen).Click += buttonOpen_Click;
		((ToolStripItem)buttonSave).DisplayStyle = (ToolStripItemDisplayStyle)2;
		((ToolStripItem)buttonSave).Image = (Image)componentResourceManager.GetObject("buttonSave.Image");
		((ToolStripItem)buttonSave).ImageTransparentColor = Color.Magenta;
		((ToolStripItem)buttonSave).Name = "buttonSave";
		((ToolStripItem)buttonSave).Size = new Size(23, 22);
		((ToolStripItem)buttonSave).Text = "toolStripButton15";
		((ToolStripItem)buttonSave).ToolTipText = "Save File";
		((ToolStripItem)buttonSave).Click += buttonSave_Click;
		((ToolStripItem)buttonClose).DisplayStyle = (ToolStripItemDisplayStyle)2;
		((ToolStripItem)buttonClose).Image = (Image)componentResourceManager.GetObject("buttonClose.Image");
		((ToolStripItem)buttonClose).ImageTransparentColor = Color.Magenta;
		((ToolStripItem)buttonClose).Name = "buttonClose";
		((ToolStripItem)buttonClose).Size = new Size(23, 22);
		((ToolStripItem)buttonClose).Text = "Close File";
		((ToolStripItem)buttonClose).ToolTipText = "Close File";
		((ToolStripItem)buttonClose).Click += buttonClose_Click;
		((ToolStripItem)toolStripSeparator1).Name = "toolStripSeparator1";
		((ToolStripItem)toolStripSeparator1).Size = new Size(6, 25);
		((ToolStripItem)buttonExportSingle).DisplayStyle = (ToolStripItemDisplayStyle)2;
		((ToolStripItem)buttonExportSingle).Image = (Image)componentResourceManager.GetObject("buttonExportSingle.Image");
		((ToolStripItem)buttonExportSingle).ImageTransparentColor = Color.Magenta;
		((ToolStripItem)buttonExportSingle).Name = "buttonExportSingle";
		((ToolStripItem)buttonExportSingle).Size = new Size(23, 22);
		((ToolStripItem)buttonExportSingle).Text = "toolStripButton3";
		((ToolStripItem)buttonExportSingle).ToolTipText = "Export Single Table";
		((ToolStripItem)buttonExportSingle).Click += buttonExportSingle_Click;
		((ToolStripItem)buttonExportMulti).DisplayStyle = (ToolStripItemDisplayStyle)2;
		((ToolStripItem)buttonExportMulti).Image = (Image)componentResourceManager.GetObject("buttonExportMulti.Image");
		((ToolStripItem)buttonExportMulti).ImageTransparentColor = Color.Magenta;
		((ToolStripItem)buttonExportMulti).Name = "buttonExportMulti";
		((ToolStripItem)buttonExportMulti).Size = new Size(23, 22);
		((ToolStripItem)buttonExportMulti).Text = "toolStripButton4";
		((ToolStripItem)buttonExportMulti).ToolTipText = "Export All Tables";
		((ToolStripItem)buttonExportMulti).Click += buttonExportMulti_Click;
		((ToolStripItem)buttonImportSingle).DisplayStyle = (ToolStripItemDisplayStyle)2;
		((ToolStripItem)buttonImportSingle).Image = (Image)componentResourceManager.GetObject("buttonImportSingle.Image");
		((ToolStripItem)buttonImportSingle).ImageTransparentColor = Color.Magenta;
		((ToolStripItem)buttonImportSingle).Name = "buttonImportSingle";
		((ToolStripItem)buttonImportSingle).Size = new Size(23, 22);
		((ToolStripItem)buttonImportSingle).Text = "toolStripButton5";
		((ToolStripItem)buttonImportSingle).ToolTipText = "Import Single Table";
		((ToolStripItem)buttonImportSingle).Click += buttonImportSingle_Click;
		((ToolStripItem)buttonImportMulti).DisplayStyle = (ToolStripItemDisplayStyle)2;
		((ToolStripItem)buttonImportMulti).Image = (Image)componentResourceManager.GetObject("buttonImportMulti.Image");
		((ToolStripItem)buttonImportMulti).ImageTransparentColor = Color.Magenta;
		((ToolStripItem)buttonImportMulti).Name = "buttonImportMulti";
		((ToolStripItem)buttonImportMulti).Size = new Size(23, 22);
		((ToolStripItem)buttonImportMulti).Text = "toolStripButton6";
		((ToolStripItem)buttonImportMulti).ToolTipText = "Import All Tables";
		((ToolStripItem)buttonImportMulti).Click += buttonImportMulti_Click;
		((ToolStripItem)buttonIntelliEdit).DisplayStyle = (ToolStripItemDisplayStyle)2;
		((ToolStripItem)buttonIntelliEdit).Image = (Image)componentResourceManager.GetObject("buttonIntelliEdit.Image");
		((ToolStripItem)buttonIntelliEdit).ImageTransparentColor = Color.Magenta;
		((ToolStripItem)buttonIntelliEdit).Name = "buttonIntelliEdit";
		((ToolStripItem)buttonIntelliEdit).Size = new Size(23, 22);
		((ToolStripItem)buttonIntelliEdit).Text = "Load Intelli-Edit";
		((ToolStripItem)buttonIntelliEdit).Click += buttonIntelliEdit_Click;
		((ToolStripItem)toolStripSeparator2).Name = "toolStripSeparator2";
		((ToolStripItem)toolStripSeparator2).Size = new Size(6, 25);
		((ToolStripItem)buttonRecordCopy).DisplayStyle = (ToolStripItemDisplayStyle)2;
		((ToolStripItem)buttonRecordCopy).Image = (Image)componentResourceManager.GetObject("buttonRecordCopy.Image");
		((ToolStripItem)buttonRecordCopy).ImageTransparentColor = Color.Magenta;
		((ToolStripItem)buttonRecordCopy).Name = "buttonRecordCopy";
		((ToolStripItem)buttonRecordCopy).Size = new Size(23, 22);
		((ToolStripItem)buttonRecordCopy).Text = "toolStripButton7";
		((ToolStripItem)buttonRecordCopy).ToolTipText = "Copy Record";
		((ToolStripItem)buttonRecordCopy).Click += buttonRecordCopy_Click;
		((ToolStripItem)buttonRecordcInsert).DisplayStyle = (ToolStripItemDisplayStyle)2;
		((ToolStripItem)buttonRecordcInsert).Image = (Image)componentResourceManager.GetObject("buttonRecordcInsert.Image");
		((ToolStripItem)buttonRecordcInsert).ImageTransparentColor = Color.Magenta;
		((ToolStripItem)buttonRecordcInsert).Name = "buttonRecordcInsert";
		((ToolStripItem)buttonRecordcInsert).Size = new Size(23, 22);
		((ToolStripItem)buttonRecordcInsert).Text = "toolStripButton8";
		((ToolStripItem)buttonRecordcInsert).ToolTipText = "Insert Record";
		((ToolStripItem)buttonRecordcInsert).Click += buttonRecordcInsert_Click;
		((ToolStripItem)buttonRecordcReplace).DisplayStyle = (ToolStripItemDisplayStyle)2;
		((ToolStripItem)buttonRecordcReplace).Image = (Image)componentResourceManager.GetObject("buttonRecordcReplace.Image");
		((ToolStripItem)buttonRecordcReplace).ImageTransparentColor = Color.Magenta;
		((ToolStripItem)buttonRecordcReplace).Name = "buttonRecordcReplace";
		((ToolStripItem)buttonRecordcReplace).Size = new Size(23, 22);
		((ToolStripItem)buttonRecordcReplace).Text = "toolStripButton9";
		((ToolStripItem)buttonRecordcReplace).ToolTipText = "Replace Record";
		((ToolStripItem)buttonRecordcReplace).Click += buttonRecordcReplace_Click;
		((ToolStripItem)buttonRecordcDelete).DisplayStyle = (ToolStripItemDisplayStyle)2;
		((ToolStripItem)buttonRecordcDelete).Image = (Image)componentResourceManager.GetObject("buttonRecordcDelete.Image");
		((ToolStripItem)buttonRecordcDelete).ImageTransparentColor = Color.Magenta;
		((ToolStripItem)buttonRecordcDelete).Name = "buttonRecordcDelete";
		((ToolStripItem)buttonRecordcDelete).Size = new Size(23, 22);
		((ToolStripItem)buttonRecordcDelete).Text = "toolStripButton10";
		((ToolStripItem)buttonRecordcDelete).ToolTipText = "Delete Record";
		((ToolStripItem)buttonRecordcDelete).Click += buttonRecordcDelete_Click;
		((ToolStripItem)buttonRecordcCount).DisplayStyle = (ToolStripItemDisplayStyle)2;
		((ToolStripItem)buttonRecordcCount).Image = (Image)componentResourceManager.GetObject("buttonRecordcCount.Image");
		((ToolStripItem)buttonRecordcCount).ImageTransparentColor = Color.Magenta;
		((ToolStripItem)buttonRecordcCount).Name = "buttonRecordcCount";
		((ToolStripItem)buttonRecordcCount).Size = new Size(23, 22);
		((ToolStripItem)buttonRecordcCount).Text = "toolStripButton11";
		((ToolStripItem)buttonRecordcCount).ToolTipText = "Count Records";
		((ToolStripItem)buttonRecordcCount).Click += buttonRecordcCount_Click;
		((ToolStripItem)toolStripSeparator3).Name = "toolStripSeparator3";
		((ToolStripItem)toolStripSeparator3).Size = new Size(6, 25);
		((ToolStripItem)buttonFindExactly).DisplayStyle = (ToolStripItemDisplayStyle)2;
		((ToolStripItem)buttonFindExactly).Image = (Image)componentResourceManager.GetObject("buttonFindExactly.Image");
		((ToolStripItem)buttonFindExactly).ImageTransparentColor = Color.Magenta;
		((ToolStripItem)buttonFindExactly).Name = "buttonFindExactly";
		((ToolStripItem)buttonFindExactly).Size = new Size(23, 22);
		((ToolStripItem)buttonFindExactly).Text = "Find Exactly";
		((ToolStripItem)buttonFindExactly).Click += buttonFindExactly_Click;
		((ToolStripItem)buttonFind).DisplayStyle = (ToolStripItemDisplayStyle)2;
		((ToolStripItem)buttonFind).Image = (Image)componentResourceManager.GetObject("buttonFind.Image");
		((ToolStripItem)buttonFind).ImageTransparentColor = Color.Magenta;
		((ToolStripItem)buttonFind).Name = "buttonFind";
		((ToolStripItem)buttonFind).Size = new Size(23, 22);
		((ToolStripItem)buttonFind).Text = "Find";
		((ToolStripItem)buttonFind).Click += toolStripButton1_Click;
		((ToolStripItem)textSearch).Name = "textSearch";
		((ToolStripItem)textSearch).Size = new Size(200, 25);
		((ToolStripItem)textSearch).ToolTipText = "Type in the text to search";
		((ToolStripControlHost)textSearch).KeyDown += new KeyEventHandler(textSearch_KeyDown);
		((Control)contextMenuCell).Name = "contextMenuCell";
		((Control)contextMenuCell).Size = new Size(61, 4);
		((ContainerControl)this).AutoScaleDimensions = new SizeF(6f, 13f);
		((ContainerControl)this).AutoScaleMode = (AutoScaleMode)1;
		((Control)this).BackgroundImage = (Image)componentResourceManager.GetObject("$this.BackgroundImage");
		((Control)this).BackgroundImageLayout = (ImageLayout)3;
		((Form)this).ClientSize = new Size(985, 581);
		((Control)this).Controls.Add((Control)(object)splitContainer1);
		((Control)this).Controls.Add((Control)(object)toolStrip);
		((Control)this).Controls.Add((Control)(object)statusStrip);
		((Control)this).Controls.Add((Control)(object)mainMenu);
		((Form)this).Icon = (Icon)componentResourceManager.GetObject("$this.Icon");
		((Form)this).MainMenuStrip = mainMenu;
		((Control)this).Name = "DbMaster";
		((Control)this).Text = "DB Master";
		((Form)this).FormClosing += new FormClosingEventHandler(DbMaster_FormClosing);
		((Control)mainMenu).ResumeLayout(false);
		((Control)mainMenu).PerformLayout();
		((Control)statusStrip).ResumeLayout(false);
		((Control)statusStrip).PerformLayout();
		((Control)panelTop).ResumeLayout(false);
		((Control)panelTop).PerformLayout();
		((ISupportInitialize)numericMax).EndInit();
		((ISupportInitialize)numericMin).EndInit();
		((Control)splitContainer1.Panel1).ResumeLayout(false);
		((Control)splitContainer1.Panel2).ResumeLayout(false);
		((ISupportInitialize)splitContainer1).EndInit();
		((Control)splitContainer1).ResumeLayout(false);
		((ISupportInitialize)dataGridView).EndInit();
		((Control)toolStrip).ResumeLayout(false);
		((Control)toolStrip).PerformLayout();
		((Control)this).ResumeLayout(false);
		((Control)this).PerformLayout();
	}
}
