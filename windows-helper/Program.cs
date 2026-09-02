// GalaxyMediaHelper — small CLI spawned by the Electron main process
// (launcher/src/main/services/spotify/spotifyWindowsHelper.ts) to do what
// MPRIS does for the Linux build, using Windows' own equivalents instead:
// SMTC (Windows.Media.Control) for reading/controlling Spotify's session,
// NAudio's Core Audio wrapper for per-app volume (SMTC has no volume
// property). Every command prints one line of JSON (or nothing, on a
// control command) and exits 0 on success — "Spotify isn't running" is a
// normal `{ "running": false }` result, not a failure.
//
// NOTE: this file was written and reasoned through without a Windows
// machine or the .NET SDK available to compile it — see the plan's Context
// section. Treat member names here (NAudio's AudioSessionControl surface
// especially) as likely-correct, not confirmed; a first real build on
// Windows/CI is expected to need small fixes.

using System.Text.Json;
using Windows.Foundation;
using Windows.Media.Control;
using Windows.Storage.Streams;
using NAudio.CoreAudioApi;

if (args.Length == 0)
{
    Console.Error.WriteLine("Usage: GalaxyMediaHelper <now-playing|play-pause|next|previous|volume up|volume down>");
    return 1;
}

try
{
    switch (args[0])
    {
        case "now-playing":
            await PrintNowPlaying();
            break;
        case "play-pause":
            await ControlSession(s => s.TryTogglePlayPauseAsync());
            break;
        case "next":
            await ControlSession(s => s.TrySkipNextAsync());
            break;
        case "previous":
            await ControlSession(s => s.TrySkipPreviousAsync());
            break;
        case "volume":
            AdjustVolume(args.Length > 1 && args[1] == "down" ? -0.1f : 0.1f);
            break;
        default:
            Console.Error.WriteLine($"Unknown command: {args[0]}");
            return 1;
    }
    return 0;
}
catch (Exception ex)
{
    Console.Error.WriteLine(ex.Message);
    return 1;
}

// Filters for Spotify specifically (same precision MPRIS gets on Linux by
// addressing org.mpris.MediaPlayer2.spotify by name) rather than "whatever
// currently has media focus". The AUMID substring match isn't a confirmed
// exact string for the win32 desktop client — falling back to
// GetCurrentSession() covers that case if the filter ever misses.
static async Task<GlobalSystemMediaTransportControlsSession?> FindSpotifySession()
{
    var manager = await GlobalSystemMediaTransportControlsSessionManager.RequestAsync();
    foreach (var session in manager.GetSessions())
    {
        if (session.SourceAppUserModelId.Contains("spotify", StringComparison.OrdinalIgnoreCase))
        {
            return session;
        }
    }
    return manager.GetCurrentSession();
}

static async Task PrintNowPlaying()
{
    var session = await FindSpotifySession();
    if (session == null)
    {
        Console.WriteLine(JsonSerializer.Serialize(new { running = false }));
        return;
    }

    var props = await session.TryGetMediaPropertiesAsync();
    var playback = session.GetPlaybackInfo();
    string? artUri = await GetThumbnailDataUri(props.Thumbnail);

    Console.WriteLine(JsonSerializer.Serialize(new
    {
        running = true,
        isPlaying = playback.PlaybackStatus == GlobalSystemMediaTransportControlsSessionPlaybackStatus.Playing,
        trackName = props.Title ?? "",
        artistNames = props.Artist ?? "",
        albumArtUrl = artUri
    }));
}

static async Task ControlSession(Func<GlobalSystemMediaTransportControlsSession, IAsyncOperation<bool>> action)
{
    var session = await FindSpotifySession();
    if (session == null) return;
    await action(session);
}

// SMTC's thumbnail is a stream reference, not a plain URL like MPRIS's
// mpris:artUrl — read it fully and hand it back as a data: URI so the
// TypeScript side needs no platform-specific handling for album art.
static async Task<string?> GetThumbnailDataUri(IRandomAccessStreamReference? thumbnailRef)
{
    if (thumbnailRef == null) return null;
    using var stream = await thumbnailRef.OpenReadAsync();
    uint size = (uint)stream.Size;
    if (size == 0) return null;

    using var reader = new DataReader(stream);
    await reader.LoadAsync(size);
    byte[] bytes = new byte[size];
    reader.ReadBytes(bytes);
    return $"data:image/png;base64,{Convert.ToBase64String(bytes)}";
}

// No per-app volume in SMTC (unlike MPRIS's Player.Volume) — Core Audio is
// the real Windows mechanism for that, scoped to Spotify's own session
// rather than the system-wide volume media keys would touch.
static void AdjustVolume(float delta)
{
    using var enumerator = new MMDeviceEnumerator();
    using var device = enumerator.GetDefaultAudioEndpoint(DataFlow.Render, Role.Multimedia);
    var sessions = device.AudioSessionManager.Sessions;

    for (int i = 0; i < sessions.Count; i++)
    {
        var session = sessions[i];
        System.Diagnostics.Process process;
        try
        {
            process = System.Diagnostics.Process.GetProcessById((int)session.GetProcessID);
        }
        catch
        {
            continue; // process exited between enumeration and lookup, or PID 0 (system sounds)
        }

        if (process.ProcessName.Equals("Spotify", StringComparison.OrdinalIgnoreCase))
        {
            float next = Math.Clamp(session.SimpleAudioVolume.Volume + delta, 0f, 1f);
            session.SimpleAudioVolume.Volume = next;
            return;
        }
    }
}
