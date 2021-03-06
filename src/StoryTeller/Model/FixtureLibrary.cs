﻿using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Threading.Tasks;
using FubuCore;
using FubuCore.Reflection;
using FubuCore.Util;

namespace StoryTeller.Model
{
    public class FixtureLibrary
    {
        private static readonly string AssemblyName = Assembly.GetExecutingAssembly().GetName().Name;

        public static readonly Cache<Type, Fixture> FixtureCache =
            new Cache<Type, Fixture>(type => (Fixture) Activator.CreateInstance(type));

        public readonly Cache<string, Fixture> Fixtures = new Cache<string, Fixture>(key => new MissingFixture(key));
        public readonly Cache<string, FixtureModel> Models = new Cache<string, FixtureModel>();

        public static bool IsFixtureType(Type type)
        {
            if (!type.CanBeCastTo<Fixture>()) return false;
            if (type.HasAttribute<HiddenAttribute>()) return false;
            if (!type.IsConcreteWithDefaultCtor()) return false;
            if (type.IsOpenGeneric()) return false;

            return true;
        }

        public static IEnumerable<Type> FixtureTypesFor(Assembly assembly)
        {
            try
            {
                return assembly.GetExportedTypes().Where(IsFixtureType);
            }
            catch (Exception)
            {
                return new Type[0];
            }
        }

        

        public static FixtureLibrary CreateForAppDomain(CellHandling cellHandling)
        {
            var currentDomain = AppDomain.CurrentDomain;
            var assemPath = currentDomain.BaseDirectory;
            var binPath = currentDomain.SetupInformation.PrivateBinPath;
            if (binPath.IsNotEmpty())
            {
                assemPath = assemPath.AppendPath(binPath);
            }



            var fixtures = AssembliesFromPath(assemPath, referencesStoryteller)
                .SelectMany(FixtureTypesFor)
                .Select(
                    type => CreateCompiledFixture(cellHandling, type));


            var library = new FixtureLibrary();

            fixtures.Each(x =>
            {
                library.Fixtures[x.Fixture.Key] = x.Fixture;
                library.Models[x.Fixture.Key] = x.Model;
            });

            return library;
        }

        private static bool referencesStoryteller(Assembly x)
        {
            return x.GetReferencedAssemblies().Any(assem => assem.Name == AssemblyName);
        }

        public static IEnumerable<Assembly> AssembliesFromPath(string path, Predicate<Assembly> assemblyFilter)
        {


            var assemblyPaths = Directory.GetFiles(path)
                .Where(file =>
                       Path.GetExtension(file).Equals(
                           ".exe",
                           StringComparison.OrdinalIgnoreCase)
                       ||
                       Path.GetExtension(file).Equals(
                           ".dll",
                           StringComparison.OrdinalIgnoreCase));

            foreach (string assemblyPath in assemblyPaths)
            {
                Assembly assembly =
                    AppDomain.CurrentDomain.GetAssemblies().FirstOrDefault(
                        x => x.GetName().Name == Path.GetFileNameWithoutExtension(assemblyPath));

                if (assembly == null)
                {
                    try
                    {
                        assembly = Assembly.LoadFrom(assemblyPath);
                    }
                    catch
                    {
                    }
                }




                if (assembly != null && assemblyFilter(assembly))
                {
                    yield return assembly;
                }
            }
        }

        public static CompiledFixture CreateCompiledFixture(CellHandling cellHandling, Type type)
        {
            try
            {
                var fixture = Activator.CreateInstance(type) as Fixture;
                FixtureCache[type] = fixture;
                return new CompiledFixture
                {
                    Fixture = fixture,
                    Model = fixture.Compile(cellHandling)
                };
            }
            catch (Exception e)
            {
                var fixture = new InvalidFixture(type, e);
                var model = fixture.Compile(cellHandling);
                model.implementation = type.FullName;

                return new CompiledFixture
                {
                    Fixture = fixture,
                    Model = model
                };
            }
        }

        public struct CompiledFixture
        {
            public Fixture Fixture;
            public FixtureModel Model;
        }
    }
}