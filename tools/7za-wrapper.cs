using System;
using System.Diagnostics;
using System.IO;

class SevenZipWrapper
{
    static int Main(string[] args)
    {
        string dir = AppDomain.CurrentDomain.BaseDirectory;
        string real = Path.Combine(dir, "7za-real.exe");
        if (!File.Exists(real)) return 127;

        var psi = new ProcessStartInfo(real);
        psi.UseShellExecute = false;
        psi.RedirectStandardOutput = true;
        psi.RedirectStandardError = true;
        psi.CreateNoWindow = true;
        foreach (var a in args)
            psi.Arguments += "\"" + a.Replace("\"", "\\\"") + "\" ";

        var p = Process.Start(psi);
        string output = p.StandardOutput.ReadToEnd() + p.StandardError.ReadToEnd();
        p.WaitForExit();
        Console.Write(output);

        if (p.ExitCode == 2 && output.IndexOf("Cannot create symbolic link", StringComparison.OrdinalIgnoreCase) >= 0)
            return 0;
        return p.ExitCode;
    }
}
