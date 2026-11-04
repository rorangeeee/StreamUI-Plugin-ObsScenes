using System.Text.Json;
using StreamUI.Contracts;
namespace StreamUI.ObsScenes;

public record ObsSettings(bool Enabled = false, string Url = "ws://127.0.0.1:4455", string Password = "");

public sealed class ObsScenesPlugin : IStreamUIPlugin
{
    private readonly ObsSceneService obs = new();
    private string? previousScene;
    public Task StartAsync(IPluginContext context, CancellationToken stopping)
    {
        var settings = context.Settings.Deserialize<ObsSettings>(new JsonSerializerOptions(JsonSerializerDefaults.Web)) ?? new();
        if (!Uri.TryCreate(settings.Url, UriKind.Absolute, out var uri) || uri.Scheme is not ("ws" or "wss"))
            throw new ArgumentException("OBS 地址应为 ws:// 或 wss:// 地址。");
        obs.Changed += () => context.Publish("status", obs.Status);
        obs.SceneChanged += name => {
            if (name != previousScene) {
                var transition = obs.Status.Transition is { Phase: "started" } active ? active : null;
                previousScene = name;
                context.Publish("scene-changed", new { id = transition?.Id ?? Guid.NewGuid().ToString("N"), name,
                    startedAt = transition?.StartedAt ?? DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() });
            }
            return Task.CompletedTask;
        };
        obs.Configure(settings); context.Publish("status", obs.Status);
        return Task.CompletedTask;
    }
    public ValueTask DisposeAsync() => obs.DisposeAsync();
}
