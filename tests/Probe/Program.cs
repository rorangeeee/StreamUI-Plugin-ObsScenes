using System.Text.Json;
using StreamUI.Contracts;
using StreamUI.ObsScenes;
using var document=JsonDocument.Parse(await File.ReadAllTextAsync(args[0]));
await using var plugin=new ObsScenesPlugin();
await plugin.StartAsync(new ProbeContext(Path.GetDirectoryName(args[0])!,document.RootElement.Clone()),CancellationToken.None);
Console.WriteLine("{\"topic\":\"ready\"}");
await Console.In.ReadLineAsync();
sealed class ProbeContext(string dataDirectory,JsonElement settings):IPluginContext{
 public string Id=>"obs-scenes";public string DataDirectory=>dataDirectory;public JsonElement Settings=>settings;
 public void Publish(string topic,object? data)=>Console.WriteLine(JsonSerializer.Serialize(new{topic,data},new JsonSerializerOptions(JsonSerializerDefaults.Web)));
 public void PublishBinary(string topic,ReadOnlyMemory<byte> data){}
}
